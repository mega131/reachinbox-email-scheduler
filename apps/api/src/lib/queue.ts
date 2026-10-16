import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import { redis } from './redis.js';

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      count: 1000 // Retain last 1000 completed jobs for audit
    },
    removeOnFail: {
      count: 5000 // Retain failed jobs for inspection and recovery
    }
  }
});

// Bull Board Express Adapter
export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue as any) as any],
  serverAdapter
});
