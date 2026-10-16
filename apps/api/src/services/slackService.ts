import crypto from 'crypto';
import { WebClient } from '@slack/web-api';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { SlackState } from '@prisma/client';

export function generateSlackOAuthUrl(): { url: string; state: string } {
  if (!env.SLACK_CLIENT_ID) {
    throw new Error('SLACK_CLIENT_ID not configured in environment variables');
  }

  const state = crypto.randomBytes(24).toString('hex');
  const scopes = ['chat:write', 'incoming-webhook', 'channels:read'].join(',');

  const url = `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(
    env.SLACK_CLIENT_ID
  )}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(
    env.SLACK_REDIRECT_URI
  )}&state=${encodeURIComponent(state)}`;

  return { url, state };
}

export async function processSlackOAuthCallback(
  userId: string,
  code: string,
  returnedState: string,
  expectedState: string
): Promise<{ teamName: string; channelName?: string }> {
  if (!returnedState || returnedState !== expectedState) {
    throw new Error('Invalid Slack OAuth state parameter. Possible CSRF attack detected.');
  }

  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    throw new Error('Slack application credentials not configured');
  }

  const client = new WebClient();
  const response = await client.oauth.v2.access({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    code,
    redirect_uri: env.SLACK_REDIRECT_URI
  });

  if (!response.ok || !response.access_token) {
    throw new Error(`Slack OAuth code exchange failed: ${response.error || 'Unknown error'}`);
  }

  const accessToken = response.access_token as string;
  const encryptedToken = encrypt(accessToken);
  const teamId = response.team?.id || 'unknown_team';
  const teamName = response.team?.name || 'Slack Workspace';
  const incomingWebhook = (response as any).incoming_webhook;

  await prisma.slackConnection.upsert({
    where: { ownerId: userId },
    update: {
      encryptedAccessToken: encryptedToken,
      teamId,
      teamName,
      channelId: incomingWebhook?.channel_id || null,
      channelName: incomingWebhook?.channel || null,
      incomingWebhookUrl: incomingWebhook?.url || null,
      connectedState: SlackState.CONNECTED
    },
    create: {
      ownerId: userId,
      encryptedAccessToken: encryptedToken,
      teamId,
      teamName,
      channelId: incomingWebhook?.channel_id || null,
      channelName: incomingWebhook?.channel || null,
      incomingWebhookUrl: incomingWebhook?.url || null,
      connectedState: SlackState.CONNECTED
    }
  });

  return {
    teamName,
    channelName: incomingWebhook?.channel || undefined
  };
}

export async function disconnectSlack(userId: string): Promise<void> {
  const existing = await prisma.slackConnection.findUnique({
    where: { ownerId: userId }
  });

  if (existing) {
    await prisma.slackConnection.update({
      where: { ownerId: userId },
      data: {
        connectedState: SlackState.DISCONNECTED
      }
    });
  }
}

export async function getSlackStatus(userId: string) {
  const conn = await prisma.slackConnection.findUnique({
    where: { ownerId: userId }
  });

  if (!conn || conn.connectedState === SlackState.DISCONNECTED) {
    return {
      connected: false,
      teamName: null,
      teamId: null,
      channelName: null,
      channelId: null,
      hasWebhook: false
    };
  }

  return {
    connected: true,
    teamName: conn.teamName,
    teamId: conn.teamId,
    channelName: conn.channelName,
    channelId: conn.channelId,
    hasWebhook: !!conn.incomingWebhookUrl
  };
}

export async function sendSlackRateLimitNotification(params: {
  userId: string;
  senderEmail: string;
  hourlyLimit: number;
  deferredCount: number;
  windowHour: string;
  nextWindowTime: string;
}): Promise<{ delivered: boolean; reason?: string }> {
  const { userId, senderEmail, hourlyLimit, deferredCount, windowHour, nextWindowTime } = params;

  const conn = await prisma.slackConnection.findUnique({
    where: { ownerId: userId }
  });

  if (!conn || conn.connectedState !== SlackState.CONNECTED) {
    return { delivered: false, reason: 'Slack not connected for user' };
  }

  const messageText = `⚠️ *ReachInbox Hourly Limit Reached*\n• *Sender:* \`${senderEmail}\`\n• *Configured Limit:* ${hourlyLimit} emails/hour\n• *Deferred:* ${deferredCount} email(s) rescheduled to next window (\`${nextWindowTime}\`)\n• *Window:* ${windowHour}`;

  try {
    const token = decrypt(conn.encryptedAccessToken);
    const client = new WebClient(token);

    if (conn.incomingWebhookUrl) {
      await fetch(conn.incomingWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '⚠️ ReachInbox Rate Limit Alert',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: messageText
              }
            }
          ]
        })
      });
      return { delivered: true };
    } else if (conn.channelId) {
      await client.chat.postMessage({
        channel: conn.channelId,
        text: messageText
      });
      return { delivered: true };
    }

    return { delivered: false, reason: 'No Slack channel or webhook destination available' };
  } catch (err: any) {
    console.error('❌ Failed to deliver Slack notification:', err.message);
    return { delivered: false, reason: err.message };
  }
}
