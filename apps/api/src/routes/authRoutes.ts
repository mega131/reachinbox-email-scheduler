import { Router, Request, Response } from 'express';
import {
  generateGoogleAuthUrl,
  processGoogleCallback,
  handleDevLogin,
  handleEmailLogin
} from '../services/authService.js';
import {
  requireAuth,
  signUserSessionToken,
  setSessionCookie,
  clearSessionCookie
} from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = Router();

// GET /api/auth/google
router.get('/google', (req: Request, res: Response) => {
  try {
    const { url, state } = generateGoogleAuthUrl();
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });
    res.redirect(url);
  } catch (err: any) {
    res.redirect(`${env.FRONTEND_URL}/login?error=google_credentials_missing`);
  }
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(String(error))}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${env.FRONTEND_URL}/login?error=missing_oauth_parameters`);
    return;
  }

  const expectedState = req.cookies?.oauth_state;

  try {
    const user = await processGoogleCallback(
      String(code),
      String(state),
      expectedState
    );

    res.clearCookie('oauth_state');
    const sessionToken = signUserSessionToken(user);
    setSessionCookie(res, sessionToken);

    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  } catch (err: any) {
    console.error('OAuth Callback Error:', err.message);
    res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(err.message)}`);
  }
});

// POST /api/auth/login
// Real email authentication (creates or logs into real user account)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const user = await handleEmailLogin(email, password, name);
    const sessionToken = signUserSessionToken(user);
    setSessionCookie(res, sessionToken);

    res.json({
      success: true,
      user,
      token: sessionToken
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/dev-login
// Enables quick testing when Google OAuth credentials are not provided
router.post('/dev-login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await handleDevLogin(email);
    const sessionToken = signUserSessionToken(user);
    setSessionCookie(res, sessionToken);

    res.json({
      success: true,
      user,
      token: sessionToken
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    user: req.user
  });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
