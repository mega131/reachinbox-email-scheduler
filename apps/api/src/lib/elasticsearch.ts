import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env.js';

export const ES_INDEX_NAME = 'reachinbox-emails';

export const esClient = new Client({
  node: env.ELASTICSEARCH_NODE,
  requestTimeout: 3000
});

let isEsConnected = false;

export async function checkEsConnection(): Promise<boolean> {
  try {
    const health = await esClient.cluster.health();
    isEsConnected = !!health;
    return isEsConnected;
  } catch {
    isEsConnected = false;
    return false;
  }
}

export function getEsStatus(): boolean {
  return isEsConnected;
}

export async function initElasticsearchIndex(): Promise<void> {
  try {
    const connected = await checkEsConnection();
    if (!connected) {
      console.log('ℹ️ Elasticsearch cluster not reachable at', env.ELASTICSEARCH_NODE, '- database fallback will be used');
      return;
    }

    const indexExists = await esClient.indices.exists({ index: ES_INDEX_NAME });
    if (!indexExists) {
      await esClient.indices.create({
        index: ES_INDEX_NAME,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            campaignId: { type: 'keyword' },
            ownerId: { type: 'keyword' },
            senderEmail: { type: 'keyword' },
            recipientEmail: {
              type: 'text',
              fields: { keyword: { type: 'keyword' } }
            },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledTime: { type: 'date' },
            sentTime: { type: 'date' },
            createdAt: { type: 'date' }
          }
        }
      });
      console.log(`✅ Elasticsearch index '${ES_INDEX_NAME}' initialized`);
    }
  } catch (err: any) {
    console.warn('⚠️ Elasticsearch init warning:', err.message);
  }
}

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
    if (!isEsConnected) return;
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
    console.warn(`⚠️ Failed to index email ${emailRecord.id} in ES:`, err.message);
  }
}
