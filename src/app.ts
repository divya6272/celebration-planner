import compression from 'compression';
import express, { type ErrorRequestHandler, type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import type { IdeaService } from './ai/idea-service.js';
import { todayIso } from './planner/dates.js';
import { buildPlan } from './planner/plan.js';
import { parseEventInput } from './validation.js';

export interface AppDependencies {
  ideaService: IdeaService;
  /** Requests per minute per IP for all `/api` routes. */
  rateLimitPerMinute: number;
  /** Stricter limit for `/api/ideas`, which can call a paid model. */
  aiRateLimitPerMinute: number;
  /** Injected so tests control "today". */
  now?: () => Date;
  logError?: (message: string, error: unknown) => void;
}

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));
const MINUTE_MS = 60_000;

const limiter = (limit: number) =>
  rateLimit({
    windowMs: MINUTE_MS,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'rate_limited', message: 'Too many requests. Please wait a moment.' },
  });

export function createApp(deps: AppDependencies): Express {
  const { ideaService, now = () => new Date(), logError = console.error } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // one reverse proxy (Cloud Run, Render, Vercel...) in front of the app

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(compression());

  const api = express.Router();
  api.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  api.use(limiter(deps.rateLimitPerMinute));
  api.use(express.json({ limit: '10kb' }));

  api.get('/health', (_req, res) => {
    res.json({ status: 'ok', aiEnabled: ideaService.aiEnabled });
  });

  api.post('/plan', (req, res) => {
    const today = todayIso(now());
    const parsed = parseEventInput(req.body, today);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation_error', issues: parsed.issues });
      return;
    }
    res.json(buildPlan(parsed.data, today));
  });

  api.post('/ideas', limiter(deps.aiRateLimitPerMinute), async (req, res) => {
    const today = todayIso(now());
    const parsed = parseEventInput(req.body, today);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation_error', issues: parsed.issues });
      return;
    }
    const plan = buildPlan(parsed.data, today);
    res.json(await ideaService.generate(parsed.data, plan));
  });

  api.use((_req, res) => {
    res.status(404).json({ error: 'not_found', message: 'Unknown API route.' });
  });

  app.use('/api', api);

  app.use(
    express.static(PUBLIC_DIR, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );

  const onError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    const status = (error as { status?: number }).status;
    if (status === 413) {
      res.status(413).json({ error: 'payload_too_large', message: 'Request body is too large.' });
    } else if (status === 400) {
      res.status(400).json({ error: 'bad_request', message: 'Request body is not valid JSON.' });
    } else {
      logError('Unhandled error', error);
      res.status(500).json({ error: 'internal_error', message: 'Something went wrong.' });
    }
  };
  app.use(onError);

  return app;
}
