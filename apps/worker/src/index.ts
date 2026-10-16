import { Worker, Queue } from 'bullmq';
import { redis } from './lib/redis.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { processEmailJob } from './processor/emailProcessor.js';

const EMAIL_QUEUE_NAME = 'email-dispatch-queue';
const recoveryQueue = new Queue(EMAIL_QUEUE_NAME, { connection: redis });

console.log('🚀 Starting ReachInbox BullMQ Email Worker Process...');
console.log(`⚙️  Worker Concurrency: ${env.WORKER_CONCURRENCY}`);
console.log(`⏱️  Default Min Delay: ${env.DEFAULT_MIN_DELAY_MS}ms`);
console.log(`📊 Max Emails Per Hour: ${env.MAX_EMAILS_PER_HOUR}`);

// Startup Recovery: Check for any orphaned PENDING outbox events (strictly NO CRON)
async function runWorkerOutboxRecovery(): Promise<void> {
  try {
    const pendingEvents = await prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      take: 200,
      orderBy: { createdAt: 'asc' }
    });

    if (pendingEvents.length > 0) {
      console.log(`📦 [Worker Recovery] Found ${pendingEvents.length} pending outbox events. Recovering into BullMQ...`);

      for (const event of pendingEvents) {
        try {
          const payload = event.payload as {
            emailRecordId: string;
            campaignId: string;
            scheduledTime: string;
            bullmqJobId: string;
          };

          const scheduledAt = new Date(payload.scheduledTime).getTime();
          const delay = Math.max(0, scheduledAt - Date.now());

          await recoveryQueue.add(
            'send-email',
            {
              emailRecordId: payload.emailRecordId,
              campaignId: payload.campaignId
            },
            {
              jobId: payload.bullmqJobId,
              delay
            }
          );

          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'PUBLISHED' }
          });
        } catch (itemErr: any) {
          console.warn(`[Worker Recovery] Note for event ${event.id}:`, itemErr.message);
        }
      }
      console.log('✅ [Worker Recovery] Outbox queue recovery complete.');
    }
  } catch (err: any) {
    console.error('❌ Error during worker outbox recovery:', err.message);
  }
}

const worker = new Worker(
  EMAIL_QUEUE_NAME,
  async (job) => {
    return processEmailJob(job);
  },
  {
    connection: redis,
    concurrency: env.WORKER_CONCURRENCY,
    lockDuration: 30000
  }
);

worker.on('completed', (job, result) => {
  console.log(`🎯 Job ${job.id} completed. Status: ${result?.status}`);
});

worker.on('failed', (job, err) => {
  console.error(`💥 Job ${job?.id} failed after ${job?.attemptsMade} attempts: ${err.message}`);
});

worker.on('error', (err) => {
  console.error('🚨 BullMQ Worker runtime error:', err.message);
});

// Run startup recovery
runWorkerOutboxRecovery();

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Gracefully stopping BullMQ worker...`);
  try {
    await worker.close();
    await recoveryQueue.close();
    await redis.quit();
    await prisma.$disconnect();
    console.log('👋 Worker closed gracefully.');
    process.exit(0);
  } catch (err: any) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
