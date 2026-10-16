import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  generateSlackOAuthUrl,
  processSlackOAuthCallback,
  disconnectSlack,
  getSlackStatus,
  sendSlackRateLimitNotification
} from '../services/slackService.js';
import { env } from '../config/env.js';

const router = Router();

// GET /api/slack/connect
router.get('/connect', requireAuth, (req: Request, res: Response) => {
  try {
    const { url, state } = generateSlackOAuthUrl();
    res.cookie('slack_oauth_state', state, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });
    res.redirect(url);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/slack/callback
router.get('/callback', requireAuth, async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    res.redirect(`${env.FRONTEND_URL}/settings?slack_error=${encodeURIComponent(String(error))}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${env.FRONTEND_URL}/settings?slack_error=missing_parameters`);
    return;
  }

  const expectedState = req.cookies?.slack_oauth_state;

  try {
    await processSlackOAuthCallback(
      req.user!.id,
      String(code),
      String(state),
      expectedState
    );

    res.clearCookie('slack_oauth_state');
    res.redirect(`${env.FRONTEND_URL}/settings?slack=connected`);
  } catch (err: any) {
    res.redirect(`${env.FRONTEND_URL}/settings?slack_error=${encodeURIComponent(err.message)}`);
  }
});

// GET /api/slack/status
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = await getSlackStatus(req.user!.id);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/slack/connection
router.delete('/connection', requireAuth, async (req: Request, res: Response) => {
  try {
    await disconnectSlack(req.user!.id);
    res.json({ success: true, message: 'Slack integration disconnected successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/slack/test-notification
router.post('/test-notification', requireAuth, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentHour = `${now.toISOString().slice(0, 13)}:00`;
    const nextWindow = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const result = await sendSlackRateLimitNotification({
      userId: req.user!.id,
      senderEmail: 'test-sender@reachinbox.ai',
      hourlyLimit: env.MAX_EMAILS_PER_HOUR,
      deferredCount: 12,
      windowHour: currentHour,
      nextWindowTime: nextWindow
    });

    if (!result.delivered) {
      res.status(400).json({
        success: false,
        error: result.reason || 'Notification could not be delivered to Slack'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Test rate-limit notification sent to connected Slack channel'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
