import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getEmailsByStatus, getEmailById } from '../services/emailService.js';
import { EmailStatus } from '@reachinbox/shared';

const router = Router();

// GET /api/emails/scheduled
router.get('/scheduled', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const campaignId = req.query.campaignId as string | undefined;

    const result = await getEmailsByStatus(
      req.user!.id,
      [EmailStatus.SCHEDULED, EmailStatus.QUEUED, EmailStatus.RATE_LIMITED],
      page,
      limit,
      campaignId
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/emails/sent
router.get('/sent', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const campaignId = req.query.campaignId as string | undefined;

    const result = await getEmailsByStatus(
      req.user!.id,
      EmailStatus.SENT,
      page,
      limit,
      campaignId
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/emails/failed
router.get('/failed', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const campaignId = req.query.campaignId as string | undefined;

    const result = await getEmailsByStatus(
      req.user!.id,
      EmailStatus.FAILED,
      page,
      limit,
      campaignId
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/emails/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const record = await getEmailById(req.user!.id, req.params.id);

    if (!record) {
      res.status(404).json({ error: 'Email record not found or unauthorized' });
      return;
    }

    res.json({ email: record });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
