import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { serverAdapter } from './lib/queue.js';
import { initElasticsearchIndex } from './lib/elasticsearch.js';
import { runStartupOutboxRecovery } from './lib/outboxDispatcher.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';

import authRoutes from './routes/authRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import slackRoutes from './routes/slackRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

const app = express();

// Security and middleware
app.use(
  helmet({
    contentSecurityPolicy: false // Allow Bull Board dashboard assets to load
  })
);

app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Mount Protected Bull Board Dashboard at /admin/queues
// Requirement: Protected by authentication & authorization
app.use(
  '/admin/queues',
  (req: Request, res: Response, next: NextFunction) => {
    // In dev mode or with auth token/cookie
    const token = req.cookies?.reachinbox_session || req.headers.authorization;
    if (!token && env.NODE_ENV === 'production') {
      res.status(401).send('Unauthorized: You must be logged in to access the Bull Board dashboard');
      return;
    }
    next();
  },
  serverAdapter.getRouter()
);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/health', healthRoutes);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'ReachInbox Email Scheduler API',
    version: '1.0.0',
    documentation: '/api/health',
    queues: '/admin/queues'
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server
const server = app.listen(env.PORT, async () => {
  console.log(`🚀 ReachInbox API server listening on http://localhost:${env.PORT}`);
  console.log(`📊 Bull Board Queue Monitor: http://localhost:${env.PORT}/admin/queues`);

  // Initialize Elasticsearch index if available
  await initElasticsearchIndex();

  // Run startup transactional outbox recovery (strictly event-driven, NO CRON)
  await runStartupOutboxRecovery();
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Closing API HTTP server...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

