import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ENCRYPTION_SECRET: z.string().min(32).default('0123456789abcdef0123456789abcdef'),
  ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),
  ETHEREAL_USER: z.string().optional().default(''),
  ETHEREAL_PASS: z.string().optional().default(''),
  DEFAULT_MIN_DELAY_MS: z.coerce.number().default(2000),
  MAX_EMAILS_PER_HOUR: z.coerce.number().default(200),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().default(200),
  WORKER_CONCURRENCY: z.coerce.number().default(5)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid Worker environment configuration:', parsed.error.format());
  throw new Error('Worker environment validation failed');
}

export const env = parsed.data;
