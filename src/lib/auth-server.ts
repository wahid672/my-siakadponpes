import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { sqlite } from "./db";
import { sendOtpEmail } from "./smtp";
import type { Role } from "./auth";

export interface AuthState {
  userId: string;
  email: string;
  role: Role;
}

export const requestOtpServerFn = createServerFn({ method: "POST" })
  .validator((params: { email: string }) => params)
  .handler(async ({ data: { email } }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: "Email tidak boleh kosong" };
    }

    // Generate 6 digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    // Store in otp_codes table
    const otpId = "otp-" + crypto.randomUUID();
    sqlite.prepare("DELETE FROM otp_codes WHERE email = ?").run(cleanEmail);
    sqlite
      .prepare("INSERT INTO otp_codes (id, email, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(otpId, cleanEmail, otp, expiresAt, new Date(now).toISOString());

    // Ensure user exists in users table
    let user = sqlite.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail) as
      | { id: string; email: string; role: Role }
      | undefined;

    if (!user) {
      const userCount = (sqlite.prepare("SELECT count(*) as count FROM users").get() as any)?.count || 0;
      const role: Role = userCount === 0 ? "admin" : "user";
      const newUserId = "usr-" + crypto.randomUUID();
      const createdAt = new Date().toISOString();

      sqlite
        .prepare("INSERT INTO users (id, email, role, created_at) VALUES (?, ?, ?, ?)")
        .run(newUserId, cleanEmail, role, createdAt);

      sqlite
        .prepare("INSERT INTO profiles (id, email, full_name, organization, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(newUserId, cleanEmail, cleanEmail.split("@")[0], "Pondok Pesantren", createdAt);
    }

    // Send email via configured SMTP
    const mailRes = await sendOtpEmail(cleanEmail, otp);

    return {
      success: true,
      message: mailRes.message || `Kode OTP telah dikirim ke ${cleanEmail}`,
    };
  });

export const verifyOtpServerFn = createServerFn({ method: "POST" })
  .validator((params: { email: string; code: string }) => params)
  .handler(async ({ data: { email, code } }) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const row = sqlite
      .prepare("SELECT * FROM otp_codes WHERE email = ? AND code = ?")
      .get(cleanEmail, cleanCode) as { id: string; expires_at: number } | undefined;

    if (!row) {
      return { success: false, message: "Kode OTP salah atau tidak ditemukan." };
    }

    if (Date.now() > row.expires_at) {
      sqlite.prepare("DELETE FROM otp_codes WHERE id = ?").run(row.id);
      return { success: false, message: "Kode OTP telah kedaluwarsa. Silakan minta kode baru." };
    }

    // OTP is valid! Delete it so it cannot be reused
    sqlite.prepare("DELETE FROM otp_codes WHERE email = ?").run(cleanEmail);

    // Get user
    const user = sqlite.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail) as
      | { id: string; email: string; role: Role }
      | undefined;

    if (!user) {
      return { success: false, message: "Pengguna tidak ditemukan." };
    }

    // Create session (valid for 30 days)
    const sessionToken = "sess-" + crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    sqlite
      .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .run(sessionToken, user.id, expiresAt, new Date().toISOString());

    return {
      success: true,
      sessionToken,
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
    };
  });

export const getAuthStateServerFn = createServerFn({ method: "GET" })
  .validator((params: { sessionToken?: string } | undefined) => params || {})
  .handler(async ({ data: { sessionToken } }): Promise<AuthState | null> => {
    if (!sessionToken) return null;

    const session = sqlite
      .prepare(
        `SELECT s.id, s.expires_at, u.id as user_id, u.email, u.role 
         FROM sessions s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.id = ?`
      )
      .get(sessionToken) as { expires_at: number; user_id: string; email: string; role: Role } | undefined;

    if (!session) return null;

    if (Date.now() > session.expires_at) {
      sqlite.prepare("DELETE FROM sessions WHERE id = ?").run(sessionToken);
      return null;
    }

    return {
      userId: session.user_id,
      email: session.email,
      role: session.role,
    };
  });

export const signOutServerFn = createServerFn({ method: "POST" })
  .validator((params: { sessionToken?: string }) => params)
  .handler(async ({ data: { sessionToken } }) => {
    if (sessionToken) {
      sqlite.prepare("DELETE FROM sessions WHERE id = ?").run(sessionToken);
    }
    return { success: true };
  });
