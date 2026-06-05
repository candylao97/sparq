import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";
import { resend, EMAIL_FROM } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: "CUSTOMER" | "PROVIDER";
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const hashedPassword = await hash(data.password, 12);
  const emailVerifyToken = randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      hashedPassword,
      role: data.role as UserRole,
      emailVerifyToken,
    },
  });

  // Create empty provider profile if provider role
  if (data.role === "PROVIDER") {
    await prisma.providerProfile.create({
      data: { userId: user.id },
    });
  }

  await sendVerificationEmail(user.email, emailVerifyToken);

  return user;
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: token },
  });

  if (!user) {
    throw new Error("Invalid verification token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      emailVerifyToken: null,
    },
  });

  return user;
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Don't reveal if email exists
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 3600000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpires: expires,
    },
  });

  await sendPasswordResetEmail(email, token);
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired reset token");
  }

  const hashedPassword = await hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
}

async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Verify your Sparq account",
      html: `
        <h2>Welcome to Sparq!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;">Verify Email</a>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send verification email:", error);
  }
}

async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Reset your Sparq password",
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }
}
