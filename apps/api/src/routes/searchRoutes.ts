import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { searchEmails } from '../services/emailService.js';
import { SearchQuerySchema, EmailStatus } from '@reachinbox/shared';

const router = Router();

// GET /api/search
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const validated = SearchQuerySchema.parse({
      q: req.query.q,
      status: req.query.status as EmailStatus,
      campaignId: req.query.campaignId,
      page: req.query.page,
      limit: req.query.limit
    });

    const result = await searchEmails({
      userId: req.user!.id,
      query: validated.q,
      status: validated.status,
      campaignId: validated.campaignId,
      page: validated.page,
      limit: validated.limit
    });

    res.json(result);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid search parameters', details: err.errors });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
