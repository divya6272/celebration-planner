import type { JsonModelClient } from './model-client.js';

export interface GroqClientOptions {
  apiKey: string;
  model: string;
  /** Overridable for tests. */
  fetchImpl?: typeof fetch;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface ChatCompletion {
  choices?: { message?: { content?: string | null } }[];
}

/** Groq exposes an OpenAI-compatible API, so a plain `fetch` is all that is needed. */
export function createGroqClient({
  apiKey,
  model,
  fetchImpl = fetch,
}: GroqClientOptions): JsonModelClient {
  return {
    async generateJson({ system, user, signal }) {
      const response = await fetchImpl(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.9,
          // gpt-oss models "reason" before answering; keep that short so the JSON is not cut off.
          max_tokens: 4096,
          ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal,
      });
      // Status only: the response body is not logged in case it echoes request details.
      if (!response.ok) throw new Error(`Groq request failed with status ${response.status}`);

      const data = (await response.json()) as ChatCompletion;
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Groq returned an empty response');
      return text;
    },
  };
}
