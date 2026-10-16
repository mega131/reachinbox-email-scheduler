import Redis from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  }
});

redis.on('connect', () => {
  console.log('✅ Worker Redis connection established');
});

redis.on('error', (err) => {
  console.error('❌ Worker Redis error:', err.message);
});
