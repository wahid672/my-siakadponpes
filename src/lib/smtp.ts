import nodemailer from "nodemailer";
import { sqlite } from "./db";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  isEnabled: boolean;
}

export const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  user: "",
  pass: "",
  fromEmail: "admin@siakadponpes.com",
  fromName: "SIAKAD PONPES",
  isEnabled: false,
};

export function getSmtpConfig(): SmtpConfig {
  try {
    const row = sqlite.prepare("SELECT value FROM settings WHERE key = 'smtp'").get() as { value: string } | undefined;
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      return {
        ...DEFAULT_SMTP_CONFIG,
        ...parsed,
        port: Number(parsed.port || 465),
        secure: parsed.secure !== undefined ? Boolean(parsed.secure) : true,
      };
    }
  } catch (err) {
    console.warn("[SMTP] Failed to load config from database:", err);
  }
  return DEFAULT_SMTP_CONFIG;
}

export function saveSmtpConfig(config: SmtpConfig): { success: boolean; message: string } {
  try {
    sqlite
      .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('smtp', ?, ?)")
      .run(JSON.stringify(config), new Date().toISOString());
    return { success: true, message: "Pengaturan SMTP berhasil disimpan di database!" };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal menyimpan pengaturan SMTP" };
  }
}

export async function testSmtpConnection(
  config: SmtpConfig,
  targetEmail: string
): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host.trim(),
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user.trim(),
        pass: config.pass.trim(),
      },
    });

    await transporter.verify();

    if (targetEmail) {
      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail || config.user}>`,
        to: targetEmail,
        subject: "Tes Konfigurasi SMTP — SIAKAD PONPES",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #0f766e;">Koneksi SMTP Berhasil!</h2>
            <p>Email ini dikirim untuk menguji konfigurasi SMTP SIAKAD PONPES.</p>
            <p style="font-size: 13px; color: #64748b;">Waktu kirim: ${new Date().toLocaleString("id-ID")}</p>
          </div>
        `,
      });
    }

    return {
      success: true,
      message: `Berhasil terhubung ke server SMTP ${config.host} dan email tes terkirim ke ${targetEmail}!`,
    };
  } catch (err: any) {
    console.error("[SMTP Test Error]:", err);
    return {
      success: false,
      message: `Gagal verifikasi SMTP: ${err.message}`,
    };
  }
}

export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<{ success: boolean; message: string }> {
  const config = getSmtpConfig();

  // Always log OTP in server console for development / backup access
  console.log(`\n========================================`);
  console.log(`[AUTH OTP CODE] Email: ${toEmail} | Kode: ${otpCode}`);
  console.log(`========================================\n`);

  if (!config.isEnabled || !config.user || !config.pass) {
    return {
      success: true,
      message: `Kode OTP dibuat: ${otpCode} (SMTP belum aktif, periksa konsol server untuk kode OTP).`,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host.trim(),
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user.trim(),
        pass: config.pass.trim(),
      },
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail || config.user}>`,
      to: toEmail,
      subject: `${otpCode} adalah Kode Verifikasi Masuk SIAKAD PONPES`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800;">SIAKAD PONPES</h2>
            <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Sistem Informasi Akademik & Keuangan Pesantren</p>
          </div>
          <div style="background: #f8fafc; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0 0 12px; font-size: 14px; color: #475569;">Gunakan kode di bawah ini untuk masuk ke akun Anda:</p>
            <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: monospace;">
              ${otpCode}
            </div>
            <p style="margin: 12px 0 0; font-size: 12px; color: #94a3b8;">Kode ini berlaku selama 10 menit. Jangan bagikan kepada siapa pun.</p>
          </div>
          <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
            Jika Anda tidak meminta kode ini, abaikan pesan ini dengan aman.
          </p>
        </div>
      `,
    });

    return { success: true, message: "Kode OTP berhasil dikirim ke email Anda." };
  } catch (err: any) {
    console.error("[SMTP Send OTP Error]:", err);
    return {
      success: true, // Keep returning true with fallback note so user is not blocked
      message: `Email gagal terkirim (${err.message}). Kode OTP Anda: ${otpCode}`,
    };
  }
}
