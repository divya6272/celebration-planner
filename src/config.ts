import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  GROQ_API_KEY: z
    .string()
    .trim()
    .optional()
    .transform((key) => (key ? key : undefined)),
  GROQ_MODEL: z.string().trim().min(1).default('openai/gpt-oss-120b'),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(15_000),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).default(60),
  AI_RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).default(10),
});

export type AppConfig = z.infer<typeof configSchema>;

/** Reads and validates configuration from environment variables, failing fast on bad values. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${problems}`);
  }
  return result.data;
}
