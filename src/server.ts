import { createApp } from './app.js';
import { selectProviders } from './ai/provider.js';
import { createIdeaService } from './ai/idea-service.js';
import { loadConfig } from './config.js';

const config = loadConfig();

const { providers, label } = selectProviders(config);

const ideaService = createIdeaService({
  providers,
  timeoutMs: config.AI_TIMEOUT_MS,
  // Log only the message: errors from the SDK can echo request details.
  onError: (error, name) => console.warn(`${name} failed:`, (error as Error).message),
});

const app = createApp({
  ideaService,
  rateLimitPerMinute: config.RATE_LIMIT_PER_MIN,
  aiRateLimitPerMinute: config.AI_RATE_LIMIT_PER_MIN,
});

const server = app.listen(config.PORT, () => {
  console.log(`Celebration planner listening on :${config.PORT} (AI: ${label})`);
});

// Cloud platforms send SIGTERM on redeploy: stop accepting connections and let in-flight ones finish.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
