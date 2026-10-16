import { z } from 'zod';

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED'
}

export enum EmailStatus {
  SCHEDULED = 'SCHEDULED',
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  RATE_LIMITED = 'RATE_LIMITED'
}

export enum SlackConnectionState {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED'
}

// Zod Schemas
export const RecipientItemSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
  variables: z.record(z.string()).optional()
});

export const CreateCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  subject: z.string().min(1, 'Email subject is required'),
  body: z.string().min(1, 'Email body is required'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO start time string'
  }),
  minDelayMs: z.number().int().min(500, 'Minimum delay must be at least 500ms').default(2000),
  hourlyLimit: z.number().int().min(1, 'Hourly limit must be at least 1').max(10000).default(200),
  senderAccountId: z.string().optional(),
  idempotencyKey: z.string().min(8, 'Idempotency key must be at least 8 characters')
});

export const ScheduleRecipientsPayloadSchema = CreateCampaignSchema.extend({
  recipients: z.array(RecipientItemSchema).min(1, 'At least one recipient is required')
});

export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(EmailStatus).optional(),
  campaignId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  campaignId: z.string().optional(),
  search: z.string().optional()
});

export type RecipientItem = z.infer<typeof RecipientItemSchema>;
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type ScheduleRecipientsPayload = z.infer<typeof ScheduleRecipientsPayloadSchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type PaginationQueryInput = z.infer<typeof PaginationQuerySchema>;

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  googleId: string;
  createdAt: string;
}

export interface EmailRecordDTO {
  id: string;
  campaignId: string;
  campaignName?: string;
  ownerId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledTime: string;
  status: EmailStatus;
  attempts: number;
  bullmqJobId?: string | null;
  sentTime?: string | null;
  etherealPreviewUrl?: string | null;
  smtpMessageId?: string | null;
  failureReason?: string | null;
  rateLimitDeferredUntil?: string | null;
  createdAt: string;
  updatedAt: string;
  senderEmail?: string;
}

export interface CampaignDTO {
  id: string;
  ownerId: string;
  name: string;
  subject: string;
  body: string;
  startTime: string;
  minDelayMs: number;
  hourlyLimit: number;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  scheduledCount: number;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStatsDTO {
  totalScheduled: number;
  totalSent: number;
  totalFailed: number;
  totalRateLimited: number;
  activeCampaigns: number;
  deliverySuccessRate: number;
  hourlyLimitCurrentHour: number;
  hourlyRemainingCapacity: number;
  configuredHourlyLimit: number;
  minDelayMs: number;
  workerConcurrency: number;
  queueStatus: {
    waiting: number;
    active: number;
    delayed: number;
    completed: number;
    failed: number;
  };
}

export interface SlackConnectionDTO {
  connected: boolean;
  teamName?: string | null;
  teamId?: string | null;
  channelName?: string | null;
  channelId?: string | null;
  hasWebhook?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
