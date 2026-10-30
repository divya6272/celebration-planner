import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createIdeaService } from '../src/ai/idea-service.js';
import type { JsonModelClient } from '../src/ai/model-client.js';

const NOW = new Date('2026-10-29T10:00:00Z');
const body = {
  eventType: 'wedding',
  guestCount: 120,
  totalBudget: 1_200_000,
  currency: 'INR',
  eventDate: '2027-02-14',
  city: 'Jaipur',
  priorities: ['food'],
};

function makeApp(
  options: { client?: JsonModelClient; rateLimit?: number; aiRateLimit?: number } = {},
) {
  const logError = vi.fn();
  const app = createApp({
    ideaService: createIdeaService({
      providers: options.client ? [{ name: 'Test AI', client: options.client }] : [],
      timeoutMs: 1000,
    }),
    rateLimitPerMinute: options.rateLimit ?? 1000,
    aiRateLimitPerMinute: options.aiRateLimit ?? 1000,
    now: () => NOW,
    logError,
  });
  return { app, logError };
}

describe('GET /api/health', () => {
  it('reports status and whether AI is enabled', async () => {
    const res = await request(makeApp().app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', aiEnabled: false });
  });
});

describe('POST /api/plan', () => {
  it('returns a full plan', async () => {
    const res = await request(makeApp().app).post('/api/plan').send(body);
    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({
      eventType: 'wedding',
      guestCount: 120,
      perGuest: 10000,
    });
    expect(res.body.budget.length).toBeGreaterThan(5);
    expect(res.body.timeline.length).toBeGreaterThan(5);
    expect(res.body.vendors.length).toBeGreaterThan(3);
  });

  it('uses the injected clock for date validation', async () => {
    const res = await request(makeApp().app)
      .post('/api/plan')
      .send({ ...body, eventDate: '2026-10-28' });
    expect(res.status).toBe(400);
    expect(res.body.issues[0].field).toBe('eventDate');
  });

  it('returns field-level validation errors', async () => {
    const res = await request(makeApp().app)
      .post('/api/plan')
      .send({ ...body, guestCount: 0, totalBudget: 'a lot' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_error');
    expect(res.body.issues.map((i: { field: string }) => i.field).sort()).toEqual([
      'guestCount',
      'totalBudget',
    ]);
  });

  it('rejects a missing or non-JSON body', async () => {
    const app = makeApp().app;
    expect((await request(app).post('/api/plan')).status).toBe(400);
    expect((await request(app).post('/api/plan').type('text').send('hello')).status).toBe(400);
  });

  it('rejects malformed JSON with a 400, not a 500', async () => {
    const res = await request(makeApp().app)
      .post('/api/plan')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('bad_request');
  });

  it('rejects oversized bodies', async () => {
    const res = await request(makeApp().app)
      .post('/api/plan')
      .send({ ...body, notes: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
  });
});

describe('POST /api/ideas', () => {
  it('returns curated ideas without an AI client', async () => {
    const res = await request(makeApp().app).post('/api/ideas').send(body);
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('fallback');
    expect(res.body.ideas.themeIdeas.length).toBeGreaterThan(0);
  });

  it('returns AI ideas when the client works', async () => {
    const ideas = {
      headline: 'h',
      themeIdeas: [{ title: 't', description: 'd' }],
      decorIdeas: ['a'],
      menuIdeas: ['b'],
      activityIdeas: ['c'],
      savingTips: ['d'],
    };
    const client: JsonModelClient = {
      generateJson: vi.fn().mockResolvedValue(JSON.stringify(ideas)),
    };
    const res = await request(makeApp({ client }).app).post('/api/ideas').send(body);
    expect(res.body).toMatchObject({ source: 'ai', provider: 'Test AI' });
  });

  it('validates input before calling the model', async () => {
    const client: JsonModelClient = { generateJson: vi.fn() };
    const res = await request(makeApp({ client }).app)
      .post('/api/ideas')
      .send({ ...body, eventType: 'x' });
    expect(res.status).toBe(400);
    expect(client.generateJson).not.toHaveBeenCalled();
  });

  it('applies a stricter rate limit', async () => {
    const app = makeApp({ aiRateLimit: 2 }).app;
    expect((await request(app).post('/api/ideas').send(body)).status).toBe(200);
    expect((await request(app).post('/api/ideas').send(body)).status).toBe(200);
    const limited = await request(app).post('/api/ideas').send(body);
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe('rate_limited');
  });
});

describe('platform behaviour', () => {
  it('rate limits the API overall', async () => {
    const app = makeApp({ rateLimit: 2 }).app;
    await request(app).get('/api/health');
    await request(app).get('/api/health');
    expect((await request(app).get('/api/health')).status).toBe(429);
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(makeApp().app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('sets security headers, a strict CSP and hides the framework', async () => {
    const res = await request(makeApp().app).get('/');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    const csp = res.headers['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
  });

  it('serves the app shell and static assets', async () => {
    const app = makeApp().app;
    const page = await request(app).get('/');
    expect(page.status).toBe(200);
    expect(page.text).toContain('<html lang="en">');
    expect((await request(app).get('/js/app.js')).status).toBe(200);
    expect((await request(app).get('/css/styles.css')).status).toBe(200);
  });

  it('never caches API responses', async () => {
    const res = await request(makeApp().app).get('/api/health');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('hides internal error details from clients', async () => {
    const logError = vi.fn();
    // Simulate an unexpected failure by making the idea service throw.
    const broken = createApp({
      ideaService: {
        aiEnabled: false,
        generate: () => Promise.reject(new Error('secret-internal-detail')),
      },
      rateLimitPerMinute: 100,
      aiRateLimitPerMinute: 100,
      now: () => NOW,
      logError,
    });
    const res = await request(broken).post('/api/ideas').send(body);
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret-internal-detail');
    expect(logError).toHaveBeenCalled();
  });
});
