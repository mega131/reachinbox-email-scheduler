import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { checkEsConnection } from '../lib/elasticsearch.js';

const router = Router();

// GET /api/health
router.get('/', async (req: Request, res: Response) => {
  const status: Record<string, any> = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {}
  };

  let allHealthy = true;

  // PostgreSQL check
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.services.postgres = { status: 'healthy' };
  } catch (err: any) {
    status.services.postgres = { status: 'unhealthy', error: err.message };
    allHealthy = false;
  }

  // Redis check
  try {
    const pong = await redis.ping();
    status.services.redis = { status: pong === 'PONG' ? 'healthy' : 'unhealthy' };
  } catch (err: any) {
    status.services.redis = { status: 'unhealthy', error: err.message };
    allHealthy = false;
  }

  // Elasticsearch check
  try {
    const esOk = await checkEsConnection();
    status.services.elasticsearch = {
      status: esOk ? 'healthy' : 'degraded (fallback to db search)'
    };
  } catch (err: any) {
    status.services.elasticsearch = {
      status: 'offline',
      note: 'Automatic PostgreSQL fallback engaged'
    };
  }

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    ...status
  });
});

export default router;
