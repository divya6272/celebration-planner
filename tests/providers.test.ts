import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createGroqClient } from '../src/ai/groq-client.js';
import { selectProviders } from '../src/ai/provider.js';

const call = { system: 's', user: 'u', signal: new AbortController().signal };

describe('selectProviders', () => {
  it('uses Groq when a key is set and no AI otherwise', () => {
    const withKey = selectProviders(loadConfig({ GROQ_API_KEY: 'q' }));
    expect(withKey.providers.map((p) => p.name)).toEqual(['Groq']);
    expect(withKey.label).toMatch(/^Groq/);
    const none = selectProviders(loadConfig({}));
    expect(none.providers).toEqual([]);
    expect(none.label).toMatch(/none/);
  });
});

describe('createGroqClient', () => {
  const okResponse = (content: unknown) =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content } }] }),
    }) as Response;

  it('sends an authorised JSON-mode request and returns the message text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse('{"a":1}'));
    const client = createGroqClient({ apiKey: 'KEY', model: 'm', fetchImpl });
    expect(await client.generateJson(call)).toBe('{"a":1}');

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer KEY');
    const sent = JSON.parse(init.body as string);
    expect(sent.response_format).toEqual({ type: 'json_object' });
    expect(sent.messages.map((m: { role: string }) => m.role)).toEqual(['system', 'user']);
    expect(init.signal).toBe(call.signal);
  });

  it('throws without leaking the key or body on HTTP errors', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response);
    const error = await createGroqClient({ apiKey: 'KEY', model: 'm', fetchImpl })
      .generateJson(call)
      .catch((e: Error) => e);
    expect((error as Error).message).toBe('Groq request failed with status 401');
  });

  it('throws on empty content', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(null));
    await expect(
      createGroqClient({ apiKey: 'K', model: 'm', fetchImpl }).generateJson(call),
    ).rejects.toThrow(/empty/);
  });
});

describe('groq reasoning models', () => {
  it('asks gpt-oss models for low reasoning effort and leaves other models alone', async () => {
    const ok = {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{}' } }] }),
    } as Response;
    const sentBody = async (model: string) => {
      const fetchImpl = vi.fn().mockResolvedValue(ok);
      await createGroqClient({ apiKey: 'K', model, fetchImpl }).generateJson(call);
      return JSON.parse((fetchImpl.mock.calls[0] as [string, RequestInit])[1].body as string);
    };
    expect((await sentBody('openai/gpt-oss-120b')).reasoning_effort).toBe('low');
    expect((await sentBody('llama-3.1-8b-instant')).reasoning_effort).toBeUndefined();
  });
});
