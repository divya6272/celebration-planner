import type { AppConfig } from '../config.js';
import { createGroqClient } from './groq-client.js';
import type { NamedProvider } from './idea-service.js';

export interface SelectedProviders {
  /** In the order they will be tried. */
  providers: NamedProvider[];
  /** Human-readable summary for logs. */
  label: string;
}

/** Builds the AI provider list from configuration. Without a key, curated ideas are used. */
export function selectProviders(config: AppConfig): SelectedProviders {
  if (!config.GROQ_API_KEY) return { providers: [], label: 'none (curated ideas only)' };
  return {
    providers: [
      {
        name: 'Groq',
        client: createGroqClient({ apiKey: config.GROQ_API_KEY, model: config.GROQ_MODEL }),
      },
    ],
    label: `Groq (${config.GROQ_MODEL})`,
  };
}
