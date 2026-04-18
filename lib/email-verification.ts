import crypto from "crypto";

import { prisma } from "@/lib/prisma";

const EMAIL_VERIFICATION_TTL_HOURS = 24;

function getAppBaseUrl() {
  const explicit = process.env.NEXTAUTH_URL;
  if (explicit) {
    return explicit;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function createEmailVerificationToken(email: string) {
  const identifier = normalizeEmail(email);
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });

  await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires,
    },
  });

  return { token, identifier, expires };
}

export async function sendVerificationEmail(email: string, token: string) {
  const normalizedEmail = normalizeEmail(email);
  const verifyUrl = `${getAppBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalizedEmail)}`;

  const hasSmtpConfig = Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );

  if (!hasSmtpConfig) {
    return {
      delivered: false,
      verifyUrl,
    };
  }

  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = port === 465;
  const from = process.env.SMTP_FROM ?? "TrackIt <no-reply@trackit.local>";

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from,
    to: normalizedEmail,
    subject: "Verify your TrackIt email",
    text: `Welcome to TrackIt. Verify your email: ${verifyUrl}`,
    html: `<p>Welcome to TrackIt.</p><p>Please verify your email by clicking this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  return {
    delivered: true,
    verifyUrl,
  };
}

export async function verifyEmailToken(email: string, token: string) {
  const identifier = normalizeEmail(email);

  const record = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token,
      },
    },
  });

  if (!record) {
    return false;
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token,
        },
      },
    });
    return false;
  }

  await prisma.user.updateMany({
    where: {
      email: {
        equals: identifier,
        mode: "insensitive",
      },
      emailVerified: null,
    },
    data: {
      emailVerified: new Date(),
    },
  });

  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });

  return true;
}