import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pkg from "pg";
const { Pool } = pkg;
import type { Request, Response, NextFunction } from "express";
import { sendVerificationEmail, sendPasswordResetEmail } from "./smtp-client";
import crypto from "crypto";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000,
});

// Handle pool errors gracefully to prevent app crashes on connection drops
pool.on('error', (err) => {
  console.error('Database pool error (auth):', err.message);
});

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userEmail?: string;
  }
}

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSSOToken(userEmail: string, userName?: string): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET not configured");
  }

  const token = jwt.sign(
    {
      sub: userEmail,  // JWT standard subject claim
      email: userEmail,
      name: userName || userEmail.split('@')[0],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (5 * 60), // 5 minutes
    },
    jwtSecret
  );

  return token;
}

export async function findUserByEmail(email: string) {
  try {
    const result = await pool.query(
      "SELECT id, email, password, email_verified, first_name, last_name, role, managed_divisions FROM users WHERE email = $1 LIMIT 1",
      [email]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      email_verified: row.email_verified,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      managedDivisions: row.managed_divisions,
    };
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw error;
  }
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createUser(email: string, password: string, firstName?: string, lastName?: string, businessVertical?: string) {
  try {
    const hashedPassword = await hashPassword(password);
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Check if SMTP is configured
    const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

    // Auto-verify email if SMTP is not configured (for local development)
    const emailVerified = !smtpConfigured;

    const result = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, verification_code, verification_code_expires_at, email_verified, business_vertical)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, email_verified, first_name, last_name, business_vertical`,
      [email, hashedPassword, firstName || null, lastName || null, verificationCode, expiresAt, emailVerified, businessVertical || null]
    );

    const user = result.rows[0];

    // Send verification email only if SMTP is configured
    if (smtpConfigured) {
      try {
        await sendVerificationEmail(email, verificationCode);
      } catch (error) {
        console.error("Failed to send verification email:", error);
        // Don't fail user creation if email fails
      }
    } else {
      console.log(`⚠️  SMTP not configured. User ${email} auto-verified. Verification code: ${verificationCode}`);
    }

    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function verifyEmailCode(email: string, code: string) {
  try {
    // Find user with matching email and verification code
    const result = await pool.query(
      `SELECT id, email, verification_code_expires_at, email_verified 
       FROM users 
       WHERE email = $1 AND verification_code = $2`,
      [email, code]
    );
    
    if (result.rows.length === 0) {
      return { success: false, message: "Invalid verification code" };
    }
    
    const user = result.rows[0];
    
    // Check if already verified
    if (user.email_verified) {
      return { success: false, message: "Email already verified" };
    }
    
    // Check if code has expired
    const now = new Date();
    if (user.verification_code_expires_at < now) {
      return { success: false, message: "Verification code has expired" };
    }
    
    // Mark user as verified and clear verification code
    await pool.query(
      `UPDATE users 
       SET email_verified = true, verification_code = NULL, verification_code_expires_at = NULL 
       WHERE id = $1`,
      [user.id]
    );
    
    return { success: true, user: { id: user.id, email: user.email } };
  } catch (error) {
    console.error("Error verifying email code:", error);
    throw error;
  }
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  }
  
  res.status(401).json({ message: "Not authenticated" });
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function requestPasswordReset(email: string, baseUrl: string) {
  try {
    // Find user by email
    const result = await pool.query(
      "SELECT id, email FROM users WHERE email = $1",
      [email]
    );
    
    if (result.rows.length === 0) {
      // Don't reveal if user exists or not for security
      return { success: true, message: "If an account exists, a reset link will be sent" };
    }
    
    const user = result.rows[0];
    
    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    // Store reset token in database
    await pool.query(
      `UPDATE users 
       SET reset_password_token = $1, reset_password_token_expires_at = $2 
       WHERE id = $3`,
      [resetToken, expiresAt, user.id]
    );
    
    // Generate reset link
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    // Check if SMTP is configured
    const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

    // Send password reset email only if SMTP is configured
    if (smtpConfigured) {
      try {
        await sendPasswordResetEmail(user.email, resetLink);
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        // Don't fail the request if email fails
      }
    } else {
      console.log(`⚠️  SMTP not configured. Password reset link for ${user.email}: ${resetLink}`);
    }

    return { success: true, message: "If an account exists, a reset link will be sent" };
  } catch (error) {
    console.error("Error requesting password reset:", error);
    throw error;
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    // Find user with matching reset token
    const result = await pool.query(
      `SELECT id, email, reset_password_token_expires_at 
       FROM users 
       WHERE reset_password_token = $1`,
      [token]
    );
    
    if (result.rows.length === 0) {
      return { success: false, message: "Invalid or expired reset token" };
    }
    
    const user = result.rows[0];
    
    // Check if token has expired
    const now = new Date();
    if (user.reset_password_token_expires_at < now) {
      return { success: false, message: "Reset token has expired" };
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password and clear reset token
    await pool.query(
      `UPDATE users 
       SET password = $1, reset_password_token = NULL, reset_password_token_expires_at = NULL 
       WHERE id = $2`,
      [hashedPassword, user.id]
    );
    
    return { success: true, message: "Password reset successfully" };
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  }
}
