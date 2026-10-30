import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('applies defaults', () => {
    const config = loadConfig({});
    expect(config.PORT).toBe(8080);
    expect(config.GROQ_API_KEY).toBeUndefined();
    expect(config.GROQ_MODEL).toBe('openai/gpt-oss-120b');
  });

  it('treats a blank API key as unset', () => {
    expect(loadConfig({ GROQ_API_KEY: '   ' }).GROQ_API_KEY).toBeUndefined();
    expect(loadConfig({ GROQ_API_KEY: 'abc' }).GROQ_API_KEY).toBe('abc');
  });

  it('coerces numeric values', () => {
    expect(loadConfig({ PORT: '3000', AI_TIMEOUT_MS: '5000' })).toMatchObject({
      PORT: 3000,
      AI_TIMEOUT_MS: 5000,
    });
  });

  it('fails fast on invalid values without echoing secrets', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Invalid configuration: PORT/);
    expect(() => loadConfig({ PORT: '99999' })).toThrow(/PORT/);
  });
});
