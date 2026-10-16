import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedUser } from '../middleware/auth.js';

let googleClient: OAuth2Client | null = null;

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  googleClient = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_CALLBACK_URL
  );
}

export function getGoogleOAuthClient(): OAuth2Client {
  if (!googleClient) {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      googleClient = new OAuth2Client(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_CALLBACK_URL
      );
      return googleClient;
    }
    throw new Error('Google OAuth credentials not configured in environment variables');
  }
  return googleClient;
}

export function generateGoogleAuthUrl(): { url: string; state: string } {
  const client = getGoogleOAuthClient();
  const state = crypto.randomBytes(32).toString('hex');

  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid'
    ],
    state,
    prompt: 'consent'
  });

  return { url, state };
}

export async function processGoogleCallback(
  code: string,
  returnedState: string,
  expectedState: string
): Promise<AuthenticatedUser> {
  if (!returnedState || returnedState !== expectedState) {
    throw new Error('Invalid OAuth state parameter. Possible CSRF attack detected.');
  }

  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.id_token) {
    throw new Error('No ID token returned by Google OpenID provider');
  }

  // Validate ID token signature, issuer and audience
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid user payload from Google ID token');
  }

  const googleId = payload.sub; // Google stable subject ID
  const email = payload.email.toLowerCase();
  const name = payload.name || payload.email.split('@')[0];
  const avatarUrl = payload.picture || null;

  // Upsert user identified by Google's stable subject ID
  let user = await prisma.user.findUnique({
    where: { googleId }
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name, email, avatarUrl }
    });
  } else {
    // If email already exists under a legacy/different login, link it
    const existingByEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { googleId, name, avatarUrl }
      });
    } else {
      user = await prisma.user.create({
        data: {
          googleId,
          email,
          name,
          avatarUrl
        }
      });
    }
  }

  // Ensure user has at least one default Ethereal sender account
  await ensureDefaultSender(user.id, user.email, user.name);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    googleId: user.googleId,
    avatarUrl: user.avatarUrl
  };
}

export async function handleEmailLogin(
  customEmail: string,
  password?: string,
  customName?: string
): Promise<AuthenticatedUser> {
  const email = (customEmail || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address');
  }

  // Format real name from email (e.g. "john.smith@gmail.com" -> "John Smith")
  const defaultName = email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ') || 'User';

  const name = customName?.trim() || defaultName;
  const googleId = `user-auth-${crypto.createHash('sha256').update(email).digest('hex').substring(0, 24)}`;
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=00A36C,2563EB,7C3AED&textColor=FFFFFF`;

  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        googleId,
        email,
        name,
        avatarUrl
      }
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name || name,
        avatarUrl: user.avatarUrl || avatarUrl
      }
    });
  }

  await ensureDefaultSender(user.id, user.email, user.name);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    googleId: user.googleId,
    avatarUrl: user.avatarUrl
  };
}

export async function handleDevLogin(customEmail?: string): Promise<AuthenticatedUser> {
  return handleEmailLogin(customEmail || 'operator@reachinbox.ai');
}

async function ensureDefaultSender(userId: string, userEmail: string, userName: string): Promise<void> {
  const existingSender = await prisma.senderAccount.findFirst({
    where: { ownerId: userId }
  });

  if (!existingSender) {
    await prisma.senderAccount.create({
      data: {
        ownerId: userId,
        senderEmail: `outreach@${userEmail.split('@')[1] || 'ethereal.mail'}`,
        senderName: userName,
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: 'ethereal_auto_managed',
        smtpPass: 'ethereal_auto_managed',
        isDefault: true,
        enabled: true
      }
    });
  }
}
