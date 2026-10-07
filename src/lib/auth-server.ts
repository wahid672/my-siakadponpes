import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { sqlite } from "./db";
import { sendOtpEmail } from "./smtp";
import { hashPassword, verifyPassword } from "./password-server";
import { validatePassword } from "./password-rules";
import type { Role } from "./auth";

export interface AuthState {
  userId: string;
  email: string;
  role: Role;
}

/**
 * 1. Check if email exists in SQLite users table
 */
export const checkEmailExistsServerFn = createServerFn({ method: "POST" })
  .validator((params: { email: string }) => params)
  .handler(async ({ data: { email } }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, exists: false, message: "Email tidak boleh kosong" };
    }

    const user = sqlite.prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?").get(cleanEmail) as
      | { id: string; email: string; password_hash?: string; role: Role }
      | undefined;

    if (!user) {
      return { success: true, exists: false, hasPassword: false };
    }

    return {
      success: true,
      exists: true,
      hasPassword: Boolean(user.password_hash),
    };
  });

/**
 * 2. Login with email & password
 */
export const loginWithPasswordServerFn = createServerFn({ method: "POST" })
  .validator((params: { email: string; password: string }) => params)
  .handler(async ({ data: { email, password } }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, message: "Email dan password wajib diisi." };
    }

    const user = sqlite.prepare("SELECT id, email, password_hash, role FROM users WHERE email = ?").get(cleanEmail) as
      | { id: string; email: string; password_hash?: string; role: Role }
      | undefined;

    if (!user) {
      return { success: false, message: "Akun dengan email ini tidak ditemukan." };
    }

    if (!user.password_hash) {
      return {
        success: false,
        requiresReset: true,
        message: "Akun Anda belum memiliki kata sandi. Silakan gunakan fitur 'Lupa / Buat Password'.",
      };
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { success: false, message: "Password yang Anda masukkan salah." };
    }

    // Password is valid -> Create session token (valid 30 days)
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

/**
 * 3. Request OTP for registration
 */
export const requestRegisterOtpServerFn = createServerFn({ method: "POST" })
  .validator((params: { email: string }) => params)
  .handler(async ({ data: { email } }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: "Email tidak boleh kosong" };
    }

    // Check if already registered
    const existing = sqlite.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
    if (existing) {
      return {
        success: false,
        message: "Email ini sudah terdaftar. Silakan langsung login dengan password Anda.",
      };
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    const otpId = "otp-" + crypto.randomUUID();
    sqlite.prepare("DELETE FROM otp_codes WHERE email = ?").run(cleanEmail);
    sqlite
      .prepare("INSERT INTO otp_codes (id, email, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(otpId, cleanEmail, otp, expiresAt, new Date(now).toISOString());

    const mailRes = await sendOtpEmail(cleanEmail, otp);
    return {
      success: true,
      message: mailRes.message || `Kode OTP berhasil dikirim ke ${cleanEmail}. Silakan periksa Kotak Masuk atau folder SPAM email Anda.`,
    };
  });

/**
 * 4. Register new user with OTP, Lembaga, Alamat, PIC, and Password (3 requirements)
 */
export const registerUserWithOtpServerFn = createServerFn({ method: "POST" })
  .validator(
    (params: {
      email: string;
      code: string;
      organization: string;
      address: string;
      pic: string;
      password: string;
    }) => params
  )
  .handler(async ({ data: { email, code, organization, address, pic, password } }) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const cleanOrg = organization.trim();
    const cleanAddress = address.trim();
    const cleanPic = pic.trim();

    if (!cleanEmail) return { success: false, message: "Email wajib diisi." };
    if (!cleanOrg) return { success: false, message: "Nama lembaga wajib diisi." };
    if (!cleanAddress) return { success: false, message: "Alamat lembaga wajib diisi." };
    if (!cleanPic) return { success: false, message: "PIC Attn wajib diisi." };

    // Validate password rules (Uppercase, Number, Special character, min 8 chars)
    const check = validatePassword(password);
    if (!check.valid) {
      return {
        success: false,
        message: `Password belum memenuhi syarat: ${check.errors.join(", ")}`,
      };
    }

    // Verify OTP
    const row = sqlite
      .prepare("SELECT * FROM otp_codes WHERE email = ? AND code = ?")
      .get(cleanEmail, cleanCode) as { id: string; expires_at: number } | undefined;

    if (!row) {
      return { success: false, message: "Kode OTP salah atau belum diminta." };
    }

    if (Date.now() > row.expires_at) {
      sqlite.prepare("DELETE FROM otp_codes WHERE id = ?").run(row.id);
      return { success: false, message: "Kode OTP telah kedaluwarsa. Silakan minta kode baru." };
    }

    // Check if user already exists
    const existing = sqlite.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
    if (existing) {
      return { success: false, message: "Email ini sudah terdaftar. Silakan login." };
    }

    // Delete used OTP
    sqlite.prepare("DELETE FROM otp_codes WHERE email = ?").run(cleanEmail);

    // Create user and profile
    const userCount = (sqlite.prepare("SELECT count(*) as count FROM users").get() as any)?.count || 0;
    const role: Role = userCount === 0 ? "admin" : "user";
    const newUserId = "usr-" + crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const passwordHash = hashPassword(password);

    sqlite
      .prepare("INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(newUserId, cleanEmail, passwordHash, role, createdAt);

    sqlite
      .prepare(
        "INSERT INTO profiles (id, email, full_name, organization, pic, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(newUserId, cleanEmail, cleanPic, cleanOrg, cleanPic, cleanAddress, createdAt);

    // Auto-login: Create session
    const sessionToken = "sess-" + crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    sqlite
      .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .run(sessionToken, newUserId, expiresAt, createdAt);

    return {
      success: true,
      sessionToken,
      user: {
        userId: newUserId,
        email: cleanEmail,
        role,
      },
      message: "Pendaftaran akun berhasil!",
    };
  });

/**
 * 5. Request OTP for Reset Password
 */
export const requestResetPasswordOtpServerFn = createServerFn({ method: "POST" })
  .validator((params: { email: string }) => params)
  .handler(async ({ data: { email } }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: "Email tidak boleh kosong" };
    }

    const existing = sqlite.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);
    if (!existing) {
      return {
        success: false,
        message: "Email tidak terdaftar di sistem SIAKAD PONPES.",
      };
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    const otpId = "otp-" + crypto.randomUUID();
    sqlite.prepare("DELETE FROM otp_codes WHERE email = ?").run(cleanEmail);
    sqlite
      .prepare("INSERT INTO otp_codes (id, email, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(otpId, cleanEmail, otp, expiresAt, new Date(now).toISOString());

    const mailRes = await sendOtpEmail(cleanEmail, otp);
    return {
      success: true,
      message: mailRes.message || `Kode OTP reset password berhasil dikirim ke ${cleanEmail}. Silakan periksa Kotak Masuk atau folder SPAM email Anda.`,
    };
  });

/**
 * 6. Reset password with OTP
 */
export const resetPasswordWithOtpServerFn = createServerFn({ method: "POST" })
  .validator((params: { email: string; code: string; newPassword: string }) => params)
  .handler(async ({ data: { email, code, newPassword } }) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const check = validatePassword(newPassword);
    if (!check.valid) {
      return {
        success: false,
        message: `Password belum memenuhi syarat: ${check.errors.join(", ")}`,
      };
    }

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

    const user = sqlite.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail) as
      | { id: string }
      | undefined;

    if (!user) {
      return { success: false, message: "Pengguna tidak ditemukan." };
    }

    // Update password
    const newHash = hashPassword(newPassword);
    sqlite.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, user.id);

    // Delete OTP
    sqlite.prepare("DELETE FROM otp_codes WHERE email = ?").run(cleanEmail);

    return {
      success: true,
      message: "Password berhasil diperbarui! Silakan masuk menggunakan password baru Anda.",
    };
  });

/**
 * 7. Change password for logged-in user
 */
export const changePasswordServerFn = createServerFn({ method: "POST" })
  .validator(
    (params: {
      sessionToken: string;
      oldPassword?: string;
      newPassword: string;
    }) => params
  )
  .handler(async ({ data: { sessionToken, oldPassword, newPassword } }) => {
    if (!sessionToken) {
      return { success: false, message: "Sesi tidak valid. Silakan login kembali." };
    }

    const session = sqlite
      .prepare(
        `SELECT s.id, u.id as user_id, u.email, u.password_hash 
         FROM sessions s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.id = ?`
      )
      .get(sessionToken) as
      | { id: string; user_id: string; email: string; password_hash?: string }
      | undefined;

    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    // If user already has a password, verify old password
    if (session.password_hash) {
      if (!oldPassword) {
        return { success: false, message: "Password lama wajib diisi." };
      }
      const isMatch = verifyPassword(oldPassword, session.password_hash);
      if (!isMatch) {
        return { success: false, message: "Password lama tidak sesuai." };
      }
    }

    // Validate new password rules
    const check = validatePassword(newPassword);
    if (!check.valid) {
      return {
        success: false,
        message: `Password baru belum memenuhi syarat: ${check.errors.join(", ")}`,
      };
    }

    const newHash = hashPassword(newPassword);
    sqlite.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, session.user_id);

    return {
      success: true,
      message: "Password akun Anda berhasil diperbarui.",
    };
  });

/**
 * 8. Legacy requestOtpServerFn (fallback)
 */
export const requestOtpServerFn = createServerFn({ method: "POST" })
  .validator((params: { email: string }) => params)
  .handler(async ({ data: { email } }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return { success: false, message: "Email tidak boleh kosong" };

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000;

    const otpId = "otp-" + crypto.randomUUID();
    sqlite.prepare("DELETE FROM otp_codes WHERE email = ?").run(cleanEmail);
    sqlite
      .prepare("INSERT INTO otp_codes (id, email, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(otpId, cleanEmail, otp, expiresAt, new Date(now).toISOString());

    const mailRes = await sendOtpEmail(cleanEmail, otp);
    return {
      success: true,
      message: mailRes.message || `Kode OTP telah dikirim ke ${cleanEmail}`,
    };
  });

/**
 * 9. Legacy verifyOtpServerFn (fallback)
 */
export const verifyOtpServerFn = createServerFn({ method: "POST" })
  .validator((params: { email: string; code: string }) => params)
  .handler(async ({ data: { email, code } }) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const row = sqlite
      .prepare("SELECT * FROM otp_codes WHERE email = ? AND code = ?")
      .get(cleanEmail, cleanCode) as { id: string; expires_at: number } | undefined;

    if (!row) return { success: false, message: "Kode OTP salah atau tidak ditemukan." };
    if (Date.now() > row.expires_at) {
      sqlite.prepare("DELETE FROM otp_codes WHERE id = ?").run(row.id);
      return { success: false, message: "Kode OTP telah kedaluwarsa." };
    }

    sqlite.prepare("DELETE FROM otp_codes WHERE email = ?").run(cleanEmail);

    const user = sqlite.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail) as
      | { id: string; email: string; role: Role }
      | undefined;

    if (!user) return { success: false, message: "Pengguna tidak ditemukan." };

    const sessionToken = "sess-" + crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    sqlite
      .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .run(sessionToken, user.id, expiresAt, new Date().toISOString());

    return {
      success: true,
      sessionToken,
      user: { userId: user.id, email: user.email, role: user.role },
    };
  });

/**
 * 10. Get current auth state from sessionToken
 */
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

/**
 * 11. Sign out session
 */
export const signOutServerFn = createServerFn({ method: "POST" })
  .validator((params: { sessionToken?: string }) => params)
  .handler(async ({ data: { sessionToken } }) => {
    if (sessionToken) {
      sqlite.prepare("DELETE FROM sessions WHERE id = ?").run(sessionToken);
    }
    return { success: true };
  });
