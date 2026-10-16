import { parse } from 'csv-parse/sync';
import { prisma } from '../lib/prisma.js';
import { dispatchPendingOutboxEvents } from '../lib/outboxDispatcher.js';
import { CampaignStatus, EmailStatus } from '@reachinbox/shared';

export interface ParsedRecipient {
  email: string;
  name?: string;
  variables?: Record<string, string>;
}

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function parseRecipientsFile(buffer: Buffer, mimetype?: string, originalname?: string): {
  valid: ParsedRecipient[];
  invalid: { raw: string; reason: string }[];
  duplicateCount: number;
} {
  const content = buffer.toString('utf8').trim();
  const rawLines: { [key: string]: string }[] = [];
  const isCsv = (mimetype && (mimetype.includes('csv') || mimetype.includes('comma-separated-values'))) ||
                (originalname && originalname.toLowerCase().endsWith('.csv')) ||
                content.includes(',');

  if (isCsv) {
    try {
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      rawLines.push(...records);
    } catch {
      // Fallback: parse as plain rows
      const rows = content.split(/\r?\n/);
      for (const row of rows) {
        if (row.trim()) rawLines.push({ email: row.trim() });
      }
    }
  } else {
    // Plain text or one email per line
    const rows = content.split(/[\r\n,;]+/);
    for (const row of rows) {
      if (row.trim()) rawLines.push({ email: row.trim() });
    }
  }

  const validMap = new Map<string, ParsedRecipient>();
  const invalid: { raw: string; reason: string }[] = [];
  let duplicateCount = 0;

  for (const row of rawLines) {
    // Locate email field case-insensitively
    let emailCandidate = '';
    let nameCandidate = '';
    const variables: Record<string, string> = {};

    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase();
      const cleanVal = String(value || '').trim();

      if (['email', 'e-mail', 'recipient', 'recipient_email', 'mail'].includes(cleanKey)) {
        emailCandidate = cleanVal;
      } else if (['name', 'full_name', 'first_name', 'recipient_name'].includes(cleanKey)) {
        nameCandidate = cleanVal;
      } else {
        variables[key.trim()] = cleanVal;
      }
    }

    if (!emailCandidate && Object.keys(row).length === 1) {
      emailCandidate = String(Object.values(row)[0] || '').trim();
    }

    if (!emailCandidate) {
      invalid.push({ raw: JSON.stringify(row), reason: 'Empty or missing email column' });
      continue;
    }

    // Careful normalization: lowercase domain part while preserving valid local-part characters
    const parts = emailCandidate.split('@');
    if (parts.length !== 2) {
      invalid.push({ raw: emailCandidate, reason: 'Malformed email address' });
      continue;
    }

    const localPart = parts[0].trim();
    const domainPart = parts[1].trim().toLowerCase();
    const normalizedEmail = `${localPart}@${domainPart}`;

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      invalid.push({ raw: emailCandidate, reason: 'Failed RFC 5322 email syntax validation' });
      continue;
    }

    // Deduplication within this batch
    const dedupeKey = normalizedEmail.toLowerCase();
    if (validMap.has(dedupeKey)) {
      duplicateCount++;
      continue;
    }

    validMap.set(dedupeKey, {
      email: normalizedEmail,
      name: nameCandidate || undefined,
      variables: Object.keys(variables).length > 0 ? variables : undefined
    });
  }

  return {
    valid: Array.from(validMap.values()),
    invalid,
    duplicateCount
  };
}

export async function createAndScheduleCampaign(params: {
  userId: string;
  name: string;
  subject: string;
  body: string;
  startTime: Date;
  minDelayMs: number;
  hourlyLimit: number;
  senderAccountId?: string;
  idempotencyKey: string;
  recipients: ParsedRecipient[];
}) {
  const {
    userId,
    name,
    subject,
    body,
    startTime,
    minDelayMs,
    hourlyLimit,
    senderAccountId,
    idempotencyKey,
    recipients
  } = params;

  // 1. Enforce Idempotency Key
  const existingCampaign = await prisma.emailCampaign.findUnique({
    where: { idempotencyKey }
  });

  if (existingCampaign) {
    if (existingCampaign.ownerId !== userId) {
      throw new Error('Idempotency key collision');
    }
    // Return existing campaign safely without re-enqueuing
    return {
      campaign: existingCampaign,
      isDuplicate: true,
      scheduledCount: existingCampaign.totalRecipients
    };
  }

  // 2. Resolve sender account
  let sender = senderAccountId
    ? await prisma.senderAccount.findFirst({
        where: { id: senderAccountId, ownerId: userId }
      })
    : null;

  if (!sender) {
    sender = await prisma.senderAccount.findFirst({
      where: { ownerId: userId, isDefault: true }
    });
  }

  if (!sender) {
    sender = await prisma.senderAccount.create({
      data: {
        ownerId: userId,
        senderEmail: 'outreach@ethereal.mail',
        senderName: 'ReachInbox Default Sender',
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: 'ethereal_auto_managed',
        smtpPass: 'ethereal_auto_managed',
        isDefault: true,
        enabled: true
      }
    });
  }

  // 3. Transactional Outbox Pattern: Persist campaign, records, and outbox events in one atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // A. Create Campaign
    const campaign = await tx.emailCampaign.create({
      data: {
        ownerId: userId,
        name,
        subject,
        body,
        startTime,
        minDelayMs,
        hourlyLimit,
        idempotencyKey,
        status: CampaignStatus.SCHEDULED,
        totalRecipients: recipients.length
      }
    });

    // B. Create EmailRecords with deterministic BullMQ Job IDs
    const emailRecordInserts = recipients.map((r, index) => {
      // Deterministic BullMQ job ID format: campaignId-index-emailHash
      const jobIdentifier = `job-${campaign.id}-${index}-${Buffer.from(r.email).toString('hex').slice(0, 12)}`;

      // Render personal template variables if any
      let renderedBody = body;
      let renderedSubject = subject;
      if (r.name) {
        renderedBody = renderedBody.replace(/\{\{\s*name\s*\}\}/gi, r.name);
        renderedSubject = renderedSubject.replace(/\{\{\s*name\s*\}\}/gi, r.name);
      }
      if (r.variables) {
        for (const [k, v] of Object.entries(r.variables)) {
          const re = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
          renderedBody = renderedBody.replace(re, v);
          renderedSubject = renderedSubject.replace(re, v);
        }
      }

      return {
        campaignId: campaign.id,
        ownerId: userId,
        senderAccountId: sender!.id,
        recipientEmail: r.email,
        subject: renderedSubject,
        body: renderedBody,
        scheduledTime: startTime,
        status: EmailStatus.SCHEDULED,
        bullmqJobId: jobIdentifier
      };
    });

    // Bulk create email records
    await tx.emailRecord.createMany({
      data: emailRecordInserts
    });

    // Fetch back created records to link OutboxEvents
    const createdRecords = await tx.emailRecord.findMany({
      where: { campaignId: campaign.id },
      select: { id: true, bullmqJobId: true, scheduledTime: true }
    });

    // C. Create OutboxEvents for each email record
    const outboxEvents = createdRecords.map((rec) => ({
      eventType: 'EMAIL_SCHEDULED',
      aggregateId: rec.id,
      status: 'PENDING' as const,
      payload: {
        emailRecordId: rec.id,
        campaignId: campaign.id,
        scheduledTime: rec.scheduledTime.toISOString(),
        bullmqJobId: rec.bullmqJobId
      }
    }));

    await tx.outboxEvent.createMany({
      data: outboxEvents
    });

    return { campaign, createdCount: createdRecords.length };
  });

  // 4. Immediately trigger asynchronous reliable dispatcher (NO CRON)
  // Even if this call fails or the process dies right here, outbox recovery catches it on restart
  setImmediate(() => {
    dispatchPendingOutboxEvents().catch((err) => {
      console.error('Async outbox dispatch error:', err.message);
    });
  });

  return {
    campaign: result.campaign,
    isDuplicate: false,
    scheduledCount: result.createdCount
  };
}

export async function getUserCampaigns(userId: string) {
  const campaigns = await prisma.emailCampaign.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { emailRecords: true }
      }
    }
  });

  // Calculate stats for each campaign
  const campaignStats = await Promise.all(
    campaigns.map(async (c) => {
      const [sent, failed, scheduled] = await Promise.all([
        prisma.emailRecord.count({
          where: { campaignId: c.id, status: EmailStatus.SENT }
        }),
        prisma.emailRecord.count({
          where: { campaignId: c.id, status: EmailStatus.FAILED }
        }),
        prisma.emailRecord.count({
          where: {
            campaignId: c.id,
            status: { in: [EmailStatus.SCHEDULED, EmailStatus.QUEUED, EmailStatus.RATE_LIMITED] }
          }
        })
      ]);

      return {
        ...c,
        totalRecipients: c.totalRecipients,
        sentCount: sent,
        failedCount: failed,
        scheduledCount: scheduled
      };
    })
  );

  return campaignStats;
}
