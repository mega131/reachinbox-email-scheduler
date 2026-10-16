import { prisma } from '../lib/prisma.js';
import { emailQueue } from '../lib/queue.js';
import { esClient, ES_INDEX_NAME, getEsStatus } from '../lib/elasticsearch.js';
import { EmailStatus, PaginatedResult, EmailRecordDTO, DashboardStatsDTO } from '@reachinbox/shared';
import { env } from '../config/env.js';

export async function getEmailsByStatus(
  userId: string,
  status: EmailStatus | EmailStatus[],
  page = 1,
  limit = 20,
  campaignId?: string
): Promise<PaginatedResult<EmailRecordDTO>> {
  const statusFilter = Array.isArray(status) ? { in: status } : status;
  const whereClause: any = {
    ownerId: userId,
    status: statusFilter
  };

  if (campaignId) {
    whereClause.campaignId = campaignId;
  }

  const [total, records] = await Promise.all([
    prisma.emailRecord.count({ where: whereClause }),
    prisma.emailRecord.findMany({
      where: whereClause,
      include: {
        campaign: { select: { name: true } },
        senderAccount: { select: { senderEmail: true } }
      },
      orderBy: { scheduledTime: 'asc' },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  const data: EmailRecordDTO[] = records.map((r) => ({
    id: r.id,
    campaignId: r.campaignId,
    campaignName: r.campaign.name,
    ownerId: r.ownerId,
    recipientEmail: r.recipientEmail,
    subject: r.subject,
    body: r.body,
    scheduledTime: r.scheduledTime.toISOString(),
    status: r.status as EmailStatus,
    attempts: r.attempts,
    bullmqJobId: r.bullmqJobId,
    sentTime: r.sentTime ? r.sentTime.toISOString() : null,
    etherealPreviewUrl: r.etherealPreviewUrl,
    smtpMessageId: r.smtpMessageId,
    failureReason: r.failureReason,
    rateLimitDeferredUntil: r.rateLimitDeferredUntil ? r.rateLimitDeferredUntil.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    senderEmail: r.senderAccount?.senderEmail
  }));

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

export async function getEmailById(userId: string, emailId: string): Promise<EmailRecordDTO | null> {
  const record = await prisma.emailRecord.findFirst({
    where: {
      id: emailId,
      ownerId: userId // Strict ownership check
    },
    include: {
      campaign: { select: { name: true } },
      senderAccount: { select: { senderEmail: true } }
    }
  });

  if (!record) return null;

  return {
    id: record.id,
    campaignId: record.campaignId,
    campaignName: record.campaign.name,
    ownerId: record.ownerId,
    recipientEmail: record.recipientEmail,
    subject: record.subject,
    body: record.body,
    scheduledTime: record.scheduledTime.toISOString(),
    status: record.status as EmailStatus,
    attempts: record.attempts,
    bullmqJobId: record.bullmqJobId,
    sentTime: record.sentTime ? record.sentTime.toISOString() : null,
    etherealPreviewUrl: record.etherealPreviewUrl,
    smtpMessageId: record.smtpMessageId,
    failureReason: record.failureReason,
    rateLimitDeferredUntil: record.rateLimitDeferredUntil ? record.rateLimitDeferredUntil.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    senderEmail: record.senderAccount?.senderEmail
  };
}

export async function searchEmails(params: {
  userId: string;
  query?: string;
  status?: EmailStatus;
  campaignId?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<EmailRecordDTO> & { source: 'elasticsearch' | 'database' }> {
  const { userId, query, status, campaignId, page = 1, limit = 20 } = params;

  // Try Elasticsearch if cluster is available
  if (getEsStatus() && query) {
    try {
      const mustClauses: any[] = [{ term: { ownerId: userId } }];

      if (status) {
        mustClauses.push({ term: { status } });
      }
      if (campaignId) {
        mustClauses.push({ term: { campaignId } });
      }

      mustClauses.push({
        multi_match: {
          query,
          fields: ['recipientEmail^3', 'subject^2', 'body', 'senderEmail'],
          fuzziness: 'AUTO'
        }
      });

      const esResult = await esClient.search({
        index: ES_INDEX_NAME,
        from: (page - 1) * limit,
        size: limit,
        query: {
          bool: {
            must: mustClauses
          }
        }
      });

      const totalHits = typeof esResult.hits.total === 'number'
        ? esResult.hits.total
        : esResult.hits.total?.value || 0;

      const ids: string[] = esResult.hits.hits
        .map((h) => h._id)
        .filter((id): id is string => typeof id === 'string');

      const dbRecords = await prisma.emailRecord.findMany({
        where: { id: { in: ids } },
        include: {
          campaign: { select: { name: true } },
          senderAccount: { select: { senderEmail: true } }
        }
      });

      // Maintain ES relevance order
      const recordMap = new Map(dbRecords.map((r) => [r.id, r]));
      const orderedRecords = ids
        .map((id) => recordMap.get(id))
        .filter((r): r is (typeof dbRecords)[0] => Boolean(r));

      const totalPages = Math.ceil(totalHits / limit) || 1;

      return {
        data: orderedRecords.map((r) => ({
          id: r.id,
          campaignId: r.campaignId,
          campaignName: r.campaign.name,
          ownerId: r.ownerId,
          recipientEmail: r.recipientEmail,
          subject: r.subject,
          body: r.body,
          scheduledTime: r.scheduledTime.toISOString(),
          status: r.status as EmailStatus,
          attempts: r.attempts,
          bullmqJobId: r.bullmqJobId,
          sentTime: r.sentTime ? r.sentTime.toISOString() : null,
          etherealPreviewUrl: r.etherealPreviewUrl,
          smtpMessageId: r.smtpMessageId,
          failureReason: r.failureReason,
          rateLimitDeferredUntil: r.rateLimitDeferredUntil ? r.rateLimitDeferredUntil.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          senderEmail: r.senderAccount?.senderEmail
        })),
        pagination: {
          page,
          limit,
          total: totalHits,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        source: 'elasticsearch'
      };
    } catch (err: any) {
      console.warn('⚠️ ES query error, falling back to database search:', err.message);
    }
  }

  // Database Search Fallback
  const whereClause: any = {
    ownerId: userId
  };

  if (status) {
    whereClause.status = status;
  }
  if (campaignId) {
    whereClause.campaignId = campaignId;
  }
  if (query && query.trim()) {
    const q = query.trim();
    whereClause.OR = [
      { recipientEmail: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { body: { contains: q, mode: 'insensitive' } }
    ];
  }

  const [total, records] = await Promise.all([
    prisma.emailRecord.count({ where: whereClause }),
    prisma.emailRecord.findMany({
      where: whereClause,
      include: {
        campaign: { select: { name: true } },
        senderAccount: { select: { senderEmail: true } }
      },
      orderBy: { scheduledTime: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: records.map((r) => ({
      id: r.id,
      campaignId: r.campaignId,
      campaignName: r.campaign.name,
      ownerId: r.ownerId,
      recipientEmail: r.recipientEmail,
      subject: r.subject,
      body: r.body,
      scheduledTime: r.scheduledTime.toISOString(),
      status: r.status as EmailStatus,
      attempts: r.attempts,
      bullmqJobId: r.bullmqJobId,
      sentTime: r.sentTime ? r.sentTime.toISOString() : null,
      etherealPreviewUrl: r.etherealPreviewUrl,
      smtpMessageId: r.smtpMessageId,
      failureReason: r.failureReason,
      rateLimitDeferredUntil: r.rateLimitDeferredUntil ? r.rateLimitDeferredUntil.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      senderEmail: r.senderAccount?.senderEmail
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    source: 'database'
  };
}

export async function getDashboardStats(userId: string): Promise<DashboardStatsDTO> {
  const [scheduled, sent, failed, rateLimited, activeCampaigns] = await Promise.all([
    prisma.emailRecord.count({
      where: {
        ownerId: userId,
        status: { in: [EmailStatus.SCHEDULED, EmailStatus.QUEUED] }
      }
    }),
    prisma.emailRecord.count({
      where: { ownerId: userId, status: EmailStatus.SENT }
    }),
    prisma.emailRecord.count({
      where: { ownerId: userId, status: EmailStatus.FAILED }
    }),
    prisma.emailRecord.count({
      where: { ownerId: userId, status: EmailStatus.RATE_LIMITED }
    }),
    prisma.emailCampaign.count({
      where: {
        ownerId: userId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      }
    })
  ]);

  // BullMQ real-time queue counts
  let queueCounts = { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0 };
  try {
    const counts = await emailQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
    queueCounts = {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      delayed: counts.delayed || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0
    };
  } catch (err: any) {
    console.warn('Queue counts fetch warning:', err.message);
  }

  const totalAttempted = sent + failed;
  const deliverySuccessRate = totalAttempted > 0 ? Math.round((sent / totalAttempted) * 100) : 100;

  return {
    totalScheduled: scheduled,
    totalSent: sent,
    totalFailed: failed,
    totalRateLimited: rateLimited,
    activeCampaigns,
    deliverySuccessRate,
    hourlyLimitCurrentHour: env.MAX_EMAILS_PER_HOUR,
    hourlyRemainingCapacity: Math.max(0, env.MAX_EMAILS_PER_HOUR - (queueCounts.active + queueCounts.completed)),
    configuredHourlyLimit: env.MAX_EMAILS_PER_HOUR,
    minDelayMs: env.DEFAULT_MIN_DELAY_MS,
    workerConcurrency: env.WORKER_CONCURRENCY,
    queueStatus: queueCounts
  };
}
