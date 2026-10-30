import { createHash } from 'node:crypto';
import type { EventInput, EventPlan, IdeaSet } from '../planner/types.js';
import { buildFallbackIdeas } from './fallback-ideas.js';
import type { JsonModelClient } from './model-client.js';
import { parseIdeaSet } from './ideas-schema.js';
import { SYSTEM_INSTRUCTION, buildUserPrompt } from './prompt.js';
import { TtlCache } from './ttl-cache.js';

export interface IdeaResult {
  /** `ai` when a model answered, `fallback` when curated ideas were used instead. */
  source: 'ai' | 'fallback';
  /** Name of the model provider that actually answered, e.g. `Groq`. */
  provider?: string;
  ideas: IdeaSet;
}

export interface NamedProvider {
  name: string;
  client: JsonModelClient;
}

export interface IdeaService {
  readonly aiEnabled: boolean;
  generate(input: EventInput, plan: EventPlan): Promise<IdeaResult>;
}

export interface IdeaServiceOptions {
  /** Tried in order; the first valid answer wins. Omit or leave empty to run without AI. */
  providers?: NamedProvider[];
  /** Per-provider time limit. */
  timeoutMs: number;
  cacheTtlMs?: number;
  cacheMaxEntries?: number;
  onError?: (error: unknown, providerName: string) => void;
}

const HOUR_MS = 3_600_000;

function cacheKey(input: EventInput): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

/**
 * Produces personalised ideas. Never throws: if every provider fails (no key, timeout, API error,
 * malformed JSON) it degrades to curated ideas so the planner keeps working.
 */
export function createIdeaService(options: IdeaServiceOptions): IdeaService {
  const { providers = [], timeoutMs, onError } = options;
  const cache = new TtlCache<{ provider: string; ideas: IdeaSet }>(
    options.cacheTtlMs ?? HOUR_MS,
    options.cacheMaxEntries ?? 200,
  );

  async function ask(
    provider: NamedProvider,
    input: EventInput,
    plan: EventPlan,
  ): Promise<IdeaSet> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Race against the abort signal so a client that ignores it still cannot hang the request.
      const aborted = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () =>
          reject(new Error('AI request timed out')),
        );
      });
      const text = await Promise.race([
        provider.client.generateJson({
          system: SYSTEM_INSTRUCTION,
          user: buildUserPrompt(input, plan),
          signal: controller.signal,
        }),
        aborted,
      ]);
      return parseIdeaSet(text);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    aiEnabled: providers.length > 0,

    async generate(input, plan) {
      if (providers.length === 0) return { source: 'fallback', ideas: buildFallbackIdeas(input) };

      const key = cacheKey(input);
      const cached = cache.get(key);
      if (cached) return { source: 'ai', ...cached };

      for (const provider of providers) {
        try {
          const ideas = await ask(provider, input, plan);
          cache.set(key, { provider: provider.name, ideas });
          return { source: 'ai', provider: provider.name, ideas };
        } catch (error) {
          onError?.(error, provider.name);
        }
      }
      return { source: 'fallback', ideas: buildFallbackIdeas(input) };
    },
  };
}
