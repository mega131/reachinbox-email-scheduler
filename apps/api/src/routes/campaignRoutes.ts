import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import {
  parseRecipientsFile,
  createAndScheduleCampaign,
  getUserCampaigns
} from '../services/campaignService.js';
import { ScheduleRecipientsPayloadSchema } from '@reachinbox/shared';
import { prisma } from '../lib/prisma.js';

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const router = Router();

// POST /api/campaigns/parse-recipients
// Safely parses and validates CSV/TXT file without persisting
router.post(
  '/parse-recipients',
  requireAuth,
  upload.single('file'),
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'No recipient file provided in form-data field "file"' });
      return;
    }

    try {
      const result = parseRecipientsFile(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      res.json({
        totalParsed: result.valid.length + result.invalid.length + result.duplicateCount,
        validCount: result.valid.length,
        duplicateCount: result.duplicateCount,
        invalidCount: result.invalid.length,
        preview: result.valid.slice(0, 50),
        invalidRows: result.invalid.slice(0, 20)
      });
    } catch (err: any) {
      res.status(400).json({ error: `File parsing error: ${err.message}` });
    }
  }
);

// POST /api/campaigns
// Idempotent schedule campaign endpoint
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const payload = ScheduleRecipientsPayloadSchema.parse(req.body);

    const result = await createAndScheduleCampaign({
      userId: req.user!.id,
      name: payload.name,
      subject: payload.subject,
      body: payload.body,
      startTime: new Date(payload.startTime),
      minDelayMs: payload.minDelayMs,
      hourlyLimit: payload.hourlyLimit,
      senderAccountId: payload.senderAccountId,
      idempotencyKey: payload.idempotencyKey,
      recipients: payload.recipients
    });

    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      isDuplicate: result.isDuplicate,
      campaign: result.campaign,
      scheduledCount: result.scheduledCount,
      message: result.isDuplicate
        ? 'Campaign already scheduled with this idempotency key'
        : `Successfully queued ${result.scheduledCount} emails for delivery`
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const campaigns = await getUserCampaigns(req.user!.id);
    res.json({ campaigns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id: req.params.id,
        ownerId: req.user!.id
      },
      include: {
        _count: {
          select: { emailRecords: true }
        }
      }
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found or unauthorized' });
      return;
    }

    res.json({ campaign });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
