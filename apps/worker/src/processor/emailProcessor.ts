import { Job, Queue } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { sendOutreachEmail } from '../lib/transporter.js';
import { checkAndReserveSendSlot } from '../lib/rateLimiter.js';
import { notifySlackHourlyLimitReached } from '../lib/slackNotifier.js';
import { indexEmailInEs } from '../lib/elasticsearch.js';
import { EmailStatus, CampaignStatus } from '@reachinbox/shared';

const EMAIL_QUEUE_NAME = 'email-dispatch-queue';
const emailQueue = new Queue(EMAIL_QUEUE_NAME, { connection: redis });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface EmailJobData {
  emailRecordId: string;
  campaignId: string;
}

export async function processEmailJob(job: Job<EmailJobData>): Promise<{
  status: string;
  messageId?: string;
  previewUrl?: string | null;
}> {
  const { emailRecordId, campaignId } = job.data;

  // 1. Fetch EmailRecord and Campaign from PostgreSQL (authoritative source of truth)
  const emailRecord = await prisma.emailRecord.findUnique({
    where: { id: emailRecordId },
    include: {
      campaign: true,
      senderAccount: true
    }
  });

  if (!emailRecord) {
    console.warn(`[Worker] EmailRecord ${emailRecordId} not found in database. Skipping job.`);
    return { status: 'SKIPPED_NOT_FOUND' };
  }

  // 2. Check for terminal states (idempotency protection against duplicate execution)
  if (emailRecord.status === EmailStatus.SENT) {
    console.log(`[Worker] EmailRecord ${emailRecordId} already in SENT state. Skipping redundant delivery.`);
    return { status: 'ALREADY_SENT', messageId: emailRecord.smtpMessageId || undefined };
  }

  // 3. Verify campaign validity and status
  if (emailRecord.campaign.status === CampaignStatus.CANCELLED || emailRecord.campaign.status === CampaignStatus.PAUSED) {
    console.log(`[Worker] Campaign ${campaignId} is ${emailRecord.campaign.status}. Skipping send.`);
    return { status: 'CAMPAIGN_INACTIVE' };
  }

  const senderId = emailRecord.senderAccountId || emailRecord.ownerId;
  const hourlyLimit = emailRecord.campaign.hourlyLimit || 200;
  const minDelayMs = emailRecord.campaign.minDelayMs || 2000;

  // 4. Atomic Rate-Limiting & Delay Coordination via Redis Lua
  const rateLimitResult = await checkAndReserveSendSlot({
    senderId,
    hourlyLimit,
    minDelayMs
  });

  if (!rateLimitResult.allowed) {
    // Hourly quota exhausted! Do NOT fail the job.
    // Gracefully defer and reschedule into the start of the next hourly window
    const now = Date.now();
    const delayMs = Math.max(2000, rateLimitResult.nextWindowTimestamp - now);
    const nextWindowDate = new Date(rateLimitResult.nextWindowTimestamp);

    console.log(
      `⏳ [Rate Limit] Hourly limit (${hourlyLimit}) reached for sender ${senderId}. Deferring email ${emailRecordId} by ${Math.round(delayMs / 1000)}s until ${nextWindowDate.toISOString()}`
    );

    // Update EmailRecord status to RATE_LIMITED
    await prisma.emailRecord.update({
      where: { id: emailRecordId },
      data: {
        status: EmailStatus.RATE_LIMITED,
        rateLimitDeferredUntil: nextWindowDate
      }
    });

    // Notify Slack if connected (deduplicated per window)
    const senderEmail = emailRecord.senderAccount?.senderEmail || 'outreach@reachinbox.ai';
    await notifySlackHourlyLimitReached({
      ownerId: emailRecord.ownerId,
      senderEmail,
      hourlyLimit,
      windowHour: rateLimitResult.windowHour,
      nextWindowIso: nextWindowDate.toISOString()
    });

    // Reschedule job into next hourly window with deterministic retry job ID
    const retryJobId = `${job.id}-window-${rateLimitResult.nextWindowTimestamp}`;
    await emailQueue.add(
      'send-email',
      {
        emailRecordId,
        campaignId
      },
      {
        jobId: retryJobId,
        delay: delayMs
      }
    );

    return { status: 'DEFERRED_RATE_LIMITED' };
  }

  // 5. Enforce minimum inter-send delay if parallel worker recently transmitted
  if (rateLimitResult.waitNeededMs > 0) {
    console.log(
      `⏱️ [Inter-Send Delay] Worker waiting ${rateLimitResult.waitNeededMs}ms to respect configured minDelay of ${minDelayMs}ms`
    );
    await sleep(rateLimitResult.waitNeededMs);
  }

  // 6. Transition state to SENDING
  await prisma.emailRecord.update({
    where: { id: emailRecordId },
    data: {
      status: EmailStatus.SENDING,
      attempts: { increment: 1 }
    }
  });

  // 7. Dispatch via Ethereal SMTP
  try {
    const senderName = emailRecord.senderAccount?.senderName || 'ReachInbox Outreach';
    const senderEmail = emailRecord.senderAccount?.senderEmail || 'outreach@ethereal.mail';

    const sendResult = await sendOutreachEmail({
      to: emailRecord.recipientEmail,
      subject: emailRecord.subject,
      html: emailRecord.body,
      fromName: senderName,
      fromEmail: senderEmail
    });

    const sentTime = new Date();

    // 8. Update database record with final successful state
    const updatedRecord = await prisma.emailRecord.update({
      where: { id: emailRecordId },
      data: {
        status: EmailStatus.SENT,
        sentTime,
        smtpMessageId: sendResult.messageId,
        etherealPreviewUrl: sendResult.previewUrl,
        failureReason: null
      }
    });

    // Update campaign progress if needed
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.IN_PROGRESS
      }
    });

    // 9. Index the updated record in Elasticsearch for instant searchability
    await indexEmailInEs({
      id: updatedRecord.id,
      campaignId: updatedRecord.campaignId,
      ownerId: updatedRecord.ownerId,
      senderEmail,
      recipientEmail: updatedRecord.recipientEmail,
      subject: updatedRecord.subject,
      body: updatedRecord.body,
      status: updatedRecord.status,
      scheduledTime: updatedRecord.scheduledTime,
      sentTime: updatedRecord.sentTime,
      createdAt: updatedRecord.createdAt
    });

    console.log(
      `✅ [Delivered] Email ${emailRecordId} sent to ${emailRecord.recipientEmail}. Ethereal Preview: ${sendResult.previewUrl}`
    );

    return {
      status: 'SENT',
      messageId: sendResult.messageId,
      previewUrl: sendResult.previewUrl
    };
  } catch (err: any) {
    console.error(`❌ [SMTP Error] Failed sending email ${emailRecordId}:`, err.message);

    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 3) - 1;

    await prisma.emailRecord.update({
      where: { id: emailRecordId },
      data: {
        status: isFinalAttempt ? EmailStatus.FAILED : EmailStatus.QUEUED,
        failureReason: err.message
      }
    });

    // Propagate error to BullMQ to trigger backoff retry if attempts remain
    throw err;
  }
}
