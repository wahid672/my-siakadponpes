import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "../../drizzle/schema";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "siakad.db");
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);

// Enable WAL mode for high concurrency and foreign keys
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

import { hashPassword } from "./password-server";

// Initialize tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    organization TEXT,
    phone TEXT,
    pic TEXT,
    address TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    issue_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unpaid',
    items TEXT NOT NULL DEFAULT '[]',
    tax_rate REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    paid_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL DEFAULT 'transfer',
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'paid',
    paid_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Auto-migrate: add password_hash column to existing databases if missing
try {
  sqlite.exec("ALTER TABLE users ADD COLUMN password_hash TEXT;");
} catch {}

// Seed default admin and settings if not present
const defaultAdminEmail = "wahidalimudin672@gmail.com";
const existingUser = sqlite.prepare("SELECT * FROM users WHERE email = ?").get(defaultAdminEmail) as
  | { id: string; password_hash?: string }
  | undefined;

if (!existingUser) {
  const adminId = "admin-" + Date.now();
  const now = new Date().toISOString();
  const defaultHash = hashPassword("Admin123!");
  sqlite.prepare("INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)").run(
    adminId,
    defaultAdminEmail,
    defaultHash,
    "admin",
    now
  );
  sqlite.prepare("INSERT INTO profiles (id, email, full_name, organization, created_at) VALUES (?, ?, ?, ?, ?)").run(
    adminId,
    defaultAdminEmail,
    "Administrator SIAKAD",
    "Pondok Pesantren",
    now
  );
} else if (!existingUser.password_hash) {
  // If admin exists but doesn't have password yet, set default Admin123!
  const defaultHash = hashPassword("Admin123!");
  sqlite.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(defaultHash, existingUser.id);
}

// Seed default settings if not present
const getSetting = sqlite.prepare("SELECT value FROM settings WHERE key = ?");
const setSetting = sqlite.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)");

if (!getSetting.get("tripay")) {
  setSetting.run(
    "tripay",
    JSON.stringify({
      mode: process.env.TRIPAY_MODE || "sandbox",
      merchant_code: process.env.TRIPAY_MERCHANT_CODE || "T10469",
      api_key: process.env.TRIPAY_API_KEY || "DEV-WqLYW5qy3V6x6BAyZbb60xkJLmYXz0cPJAqwM6qj",
      private_key: process.env.TRIPAY_PRIVATE_KEY || "LX5le-rAseG-TkHmJ-KWo8a-inGpR",
      is_enabled: true,
    }),
    new Date().toISOString()
  );
}

if (!getSetting.get("general")) {
  setSetting.run(
    "general",
    JSON.stringify({
      institutionName: "SIAKAD PONPES",
      subtitle: "Sistem Informasi Akademik & Keuangan Pesantren Terpadu",
      email: defaultAdminEmail,
      phone: "081234567890",
      address: "Kantor Penagihan & Layanan Pembayaran Santri",
      showAddressInInvoice: false,
      invoicePrefix: "INV",
      defaultNotes: "Pembayaran dapat dilakukan melalui transfer rekening atau QRIS resmi SIAKAD PONPES.",
      defaultTerms: "Invoice ini merupakan dokumen penagihan sah dan berkekuatan hukum.",
    }),
    new Date().toISOString()
  );
}

if (!getSetting.get("smtp")) {
  setSetting.run(
    "smtp",
    JSON.stringify({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== "false",
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      fromEmail: process.env.SMTP_FROM_EMAIL || defaultAdminEmail,
      fromName: process.env.SMTP_FROM_NAME || "SIAKAD PONPES",
      isEnabled: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
    }),
    new Date().toISOString()
  );
}

export const db = drizzle(sqlite, { schema });
export { sqlite };
