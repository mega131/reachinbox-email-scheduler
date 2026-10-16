import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let cachedTransporter: Transporter | null = null;
let cachedAccount: { user: string; pass: string } | null = null;

export async function getTransporter(): Promise<{
  transporter: Transporter;
  senderAddress: string;
}> {
  if (cachedTransporter && cachedAccount) {
    return {
      transporter: cachedTransporter,
      senderAddress: cachedAccount.user
    };
  }

  // If user provided custom Ethereal credentials in .env
  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
    cachedAccount = {
      user: env.ETHEREAL_USER,
      pass: env.ETHEREAL_PASS
    };
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: cachedAccount.user,
        pass: cachedAccount.pass
      }
    });

    console.log(`📧 Using configured Ethereal SMTP account: ${cachedAccount.user}`);
    return {
      transporter: cachedTransporter,
      senderAddress: cachedAccount.user
    };
  }

  // Automatically generate Ethereal test account
  console.log('🔄 Creating new Ethereal test email account...');
  const testAccount = await nodemailer.createTestAccount();
  cachedAccount = {
    user: testAccount.user,
    pass: testAccount.pass
  };

  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  console.log(`✅ Ethereal test account ready: ${testAccount.user}`);
  return {
    transporter: cachedTransporter,
    senderAddress: testAccount.user
  };
}

export async function sendOutreachEmail(params: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<{
  messageId: string;
  previewUrl: string | null;
}> {
  const { transporter, senderAddress } = await getTransporter();

  const fromDisplay = params.fromName
    ? `"${params.fromName}" <${senderAddress}>`
    : `ReachInbox Outreach <${senderAddress}>`;

  const info = await transporter.sendMail({
    from: fromDisplay,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.html.replace(/<[^>]*>/g, '') // Fallback plaintext
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || null;

  return {
    messageId: info.messageId,
    previewUrl: previewUrl ? String(previewUrl) : null
  };
}
