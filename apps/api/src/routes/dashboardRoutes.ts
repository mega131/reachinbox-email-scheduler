import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDashboardStats } from '../services/emailService.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const stats = await getDashboardStats(req.user!.id);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
