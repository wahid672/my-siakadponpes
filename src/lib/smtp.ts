import nodemailer from "nodemailer";
import { sqlite } from "./db";
import { SmtpConfig, DEFAULT_SMTP_CONFIG } from "./settings";

export type { SmtpConfig };
export { DEFAULT_SMTP_CONFIG };

function createSmtpTransporter(config: SmtpConfig) {
  const port = Number(config.port) || 465;
  // If port 465 -> SSL/TLS (secure: true)
  // If port 587 or 25 -> STARTTLS (secure: false)
  // Otherwise respect config.secure
  const secure = port === 465 ? true : port === 587 || port === 25 ? false : Boolean(config.secure);

  return nodemailer.createTransport({
    host: config.host.trim(),
    port,
    secure,
    auth: {
      user: config.user.trim(),
      pass: config.pass.trim(),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export function getSmtpConfig(): SmtpConfig {
  const envConfig: SmtpConfig = {
    host: process.env.SMTP_HOST || DEFAULT_SMTP_CONFIG.host,
    port: Number(process.env.SMTP_PORT || DEFAULT_SMTP_CONFIG.port),
    secure: process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT) === 465
      : DEFAULT_SMTP_CONFIG.secure,
    user: process.env.SMTP_USER || DEFAULT_SMTP_CONFIG.user,
    pass: process.env.SMTP_PASS || DEFAULT_SMTP_CONFIG.pass,
    fromEmail: process.env.SMTP_FROM_EMAIL || DEFAULT_SMTP_CONFIG.fromEmail,
    fromName: process.env.SMTP_FROM_NAME || DEFAULT_SMTP_CONFIG.fromName,
    isEnabled: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
  };

  try {
    const row = sqlite.prepare("SELECT value FROM settings WHERE key = 'smtp'").get() as { value: string } | undefined;
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      const port = Number(parsed.port || envConfig.port);
      const secure =
        port === 465
          ? true
          : port === 587 || port === 25
          ? false
          : parsed.secure !== undefined
          ? Boolean(parsed.secure)
          : envConfig.secure;

      return {
        ...envConfig,
        ...parsed,
        port,
        secure,
      };
    }
  } catch (err) {
    console.warn("[SMTP] Failed to load config from database:", err);
  }
  return envConfig;
}

export function saveSmtpConfig(config: SmtpConfig): { success: boolean; message: string } {
  try {
    const port = Number(config.port) || 465;
    const secure = port === 465 ? true : port === 587 || port === 25 ? false : Boolean(config.secure);
    const finalConfig: SmtpConfig = {
      ...config,
      port,
      secure,
    };

    sqlite
      .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('smtp', ?, ?)")
      .run(JSON.stringify(finalConfig), new Date().toISOString());
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
    const transporter = createSmtpTransporter(config);
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

export function getAdminContactPhone(): string {
  try {
    const row = sqlite.prepare("SELECT value FROM settings WHERE key = 'general'").get() as { value: string } | undefined;
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (parsed.phone) return String(parsed.phone).trim();
    }
  } catch (err) {
    console.warn("[SMTP] Failed to read general settings phone:", err);
  }
  return process.env.ADMIN_WHATSAPP || "081234567890";
}

export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<{ success: boolean; message: string }> {
  const config = getSmtpConfig();
  const contactPhone = getAdminContactPhone();

  // Always log OTP in server console for system administrator emergency audit
  console.log(`\n========================================`);
  console.log(`[AUTH OTP CODE] Email: ${toEmail} | Kode: ${otpCode}`);
  console.log(`========================================\n`);

  if (!config.isEnabled || !config.user || !config.pass) {
    return {
      success: false,
      message: `Layanan pengiriman email OTP sedang dinonaktifkan. Silakan hubungi admin via WhatsApp di ${contactPhone} untuk bantuan.`,
    };
  }

  try {
    const transporter = createSmtpTransporter(config);

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
            <p style="margin: 12px 0 0; font-size: 11px; color: #b45309; background: #fef3c7; padding: 8px; border-radius: 6px;">
              ⚠️ <strong>Penting:</strong> Jika email ini masuk ke folder <strong>Spam / Junk</strong>, silakan periksa dan tandai sebagai <em>"Bukan Spam"</em>.
            </p>
          </div>
          <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
            Jika Anda tidak meminta kode ini, abaikan pesan ini dengan aman.
          </p>
        </div>
      `,
    });

    return {
      success: true,
      message: "Kode OTP berhasil dikirim! Silakan periksa Kotak Masuk (Inbox) atau folder SPAM email Anda.",
    };
  } catch (err: any) {
    console.error("[SMTP Send OTP Error]:", err);
    return {
      success: false,
      message: `Sistem pengiriman email OTP sedang mengalami gangguan. Silakan coba beberapa saat lagi atau hubungi kami melalui WhatsApp di ${contactPhone}.`,
    };
  }
}
