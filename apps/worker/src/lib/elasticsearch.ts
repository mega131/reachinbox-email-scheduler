import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env.js';

export const ES_INDEX_NAME = 'reachinbox-emails';

export const esClient = new Client({
  node: env.ELASTICSEARCH_NODE,
  requestTimeout: 3000
});

export async function indexEmailInEs(emailRecord: {
  id: string;
  campaignId: string;
  ownerId: string;
  senderEmail?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledTime: Date;
  sentTime?: Date | null;
  createdAt: Date;
}): Promise<void> {
  try {
    await esClient.index({
      index: ES_INDEX_NAME,
      id: emailRecord.id,
      document: {
        id: emailRecord.id,
        campaignId: emailRecord.campaignId,
        ownerId: emailRecord.ownerId,
        senderEmail: emailRecord.senderEmail || '',
        recipientEmail: emailRecord.recipientEmail,
        subject: emailRecord.subject,
        body: emailRecord.body,
        status: emailRecord.status,
        scheduledTime: emailRecord.scheduledTime.toISOString(),
        sentTime: emailRecord.sentTime ? emailRecord.sentTime.toISOString() : null,
        createdAt: emailRecord.createdAt.toISOString()
      }
    });
  } catch (err: any) {
    // Non-critical background indexing warning
    // Database remains authoritative source of truth
    console.warn(`[Elasticsearch] Indexing note: ${err.message}`);
  }
}
