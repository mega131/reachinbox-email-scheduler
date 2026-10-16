import crypto from 'crypto';
import { WebClient } from '@slack/web-api';
import { prisma } from './prisma.js';
import { redis } from './redis.js';
import { env } from '../config/env.js';

function decryptToken(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const key = crypto.scryptSync(env.ENCRYPTION_SECRET, 'salt_reachinbox', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, {
    authTagLength: 16
  });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function notifySlackHourlyLimitReached(params: {
  ownerId: string;
  senderEmail: string;
  hourlyLimit: number;
  windowHour: string;
  nextWindowIso: string;
}): Promise<void> {
  const { ownerId, senderEmail, hourlyLimit, windowHour, nextWindowIso } = params;

  // Deduplication check in Redis to avoid alert storms (1 notification per window per owner)
  const dedupeKey = `slack:rate_limit_alert:${ownerId}:${windowHour}`;
  const alreadyNotified = await redis.set(dedupeKey, '1', 'EX', 7200, 'NX');

  if (!alreadyNotified) {
    // Already alerted for this hourly window
    return;
  }

  try {
    const conn = await prisma.slackConnection.findUnique({
      where: { ownerId }
    });

    if (!conn || conn.connectedState !== 'CONNECTED') {
      return;
    }

    const alertText = `⚠️ *ReachInbox Hourly Limit Reached*\nSender account \`${senderEmail}\` has reached the configured threshold of *${hourlyLimit} emails/hour* for window *${windowHour}*.\nSubsequent emails have been automatically deferred to window *${nextWindowIso}*.`;

    let delivered = false;

    if (conn.incomingWebhookUrl) {
      const resp = await fetch(conn.incomingWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: alertText,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '⚠️ ReachInbox Outreach Alert',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: alertText
              }
            }
          ]
        })
      });
      delivered = resp.ok;
    } else if (conn.channelId) {
      const token = decryptToken(conn.encryptedAccessToken);
      const client = new WebClient(token);
      await client.chat.postMessage({
        channel: conn.channelId,
        text: alertText
      });
      delivered = true;
    }

    // Persist NotificationEvent in PostgreSQL
    await prisma.notificationEvent.create({
      data: {
        ownerId,
        rateLimitWindow: windowHour,
        notificationType: 'HOURLY_LIMIT_REACHED',
        deliveryState: delivered ? 'DELIVERED' : 'FAILED',
        payload: {
          senderEmail,
          hourlyLimit,
          windowHour,
          nextWindowIso,
          deliveredAt: new Date().toISOString()
        }
      }
    });

    console.log(`📣 Slack alert delivered for owner ${ownerId} (window ${windowHour})`);
  } catch (err: any) {
    console.error('❌ Slack alert delivery failure:', err.message);
  }
}
