import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  /** Comma-separated list of allowed browser origins, or "*". */
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((v) => (v === '*' ? '*' : v.split(',').map((o) => o.trim()))),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Sign-in and sign-up attempts allowed per IP per 15 minutes. */
  AUTH_RATE_LIMIT: z.coerce.number().default(20),
});

export const env = schema.parse(process.env);
