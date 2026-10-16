import { prisma } from './prisma.js';
import { emailQueue } from './queue.js';

export async function dispatchPendingOutboxEvents(batchSize = 200): Promise<{
  dispatched: number;
  failed: number;
}> {
  let dispatched = 0;
  let failed = 0;

  try {
    const pendingEvents = await prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: batchSize
    });

    if (pendingEvents.length === 0) {
      return { dispatched: 0, failed: 0 };
    }

    for (const event of pendingEvents) {
      try {
        const payload = event.payload as {
          emailRecordId: string;
          campaignId: string;
          scheduledTime: string;
          bullmqJobId: string;
        };

        const scheduledAt = new Date(payload.scheduledTime).getTime();
        const now = Date.now();
        const delay = Math.max(0, scheduledAt - now);

        // Deterministic BullMQ Job ID prevents duplicate queuing
        await emailQueue.add(
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

        // Mark OutboxEvent as PUBLISHED
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PUBLISHED'
          }
        });

        dispatched++;
      } catch (err: any) {
        failed++;
        console.error(`❌ Failed to dispatch outbox event ${event.id}:`, err.message);

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts: { increment: 1 },
            lastError: err.message
          }
        });
      }
    }
  } catch (err: any) {
    console.error('❌ Error during outbox batch dispatch:', err.message);
  }

  return { dispatched, failed };
}

// Startup recovery function (strictly event-driven, NO CRON)
export async function runStartupOutboxRecovery(): Promise<void> {
  console.log('🔄 Running transactional outbox startup recovery...');
  const result = await dispatchPendingOutboxEvents(500);
  if (result.dispatched > 0 || result.failed > 0) {
    console.log(`📦 Outbox recovery completed: ${result.dispatched} dispatched, ${result.failed} failed`);
  } else {
    console.log('📦 Outbox clean - zero pending dispatch events');
  }
}
