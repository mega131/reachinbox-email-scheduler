import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  googleId: string;
  avatarUrl?: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const AUTH_COOKIE_NAME = 'reachinbox_session';

export function signUserSessionToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      googleId: user.googleId,
      avatarUrl: user.avatarUrl
    },
    env.SESSION_SECRET,
    { expiresIn: '7d' }
  );
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/, '');

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Authentication required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.SESSION_SECRET) as {
      sub: string;
      email: string;
      name: string;
      googleId: string;
      avatarUrl?: string;
    };

    // Verify user exists in PostgreSQL
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub }
    });

    if (!user) {
      clearSessionCookie(res);
      res.status(401).json({ error: 'Unauthorized: User record not found' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      googleId: user.googleId,
      avatarUrl: user.avatarUrl
    };

    next();
  } catch (err: any) {
    clearSessionCookie(res);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }
}
