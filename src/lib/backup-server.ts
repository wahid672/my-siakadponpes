import { createServerFn } from "@tanstack/react-start";
import fs from "fs";
import path from "path";
import { sqlite } from "./db";

export interface BackupPayload {
  app: string;
  version: string;
  exportDate: string;
  counts: {
    users: number;
    profiles: number;
    invoices: number;
    payments: number;
    settings: number;
  };
  data: {
    users: any[];
    profiles: any[];
    invoices: any[];
    payments: any[];
    settings: any[];
  };
}

export interface DatabaseStats {
  fileSizeBytes: number;
  fileSizeFormatted: string;
  dbPath: string;
  lastModified: string;
  counts: {
    users: number;
    profiles: number;
    invoices: number;
    payments: number;
    settings: number;
  };
}

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "siakad.db");

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * 1. Get current database size & table record counts
 */
export const getDatabaseStatsServerFn = createServerFn({ method: "GET" }).handler(async (): Promise<DatabaseStats> => {
  let fileSizeBytes = 0;
  let lastModified = new Date().toISOString();

  try {
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      fileSizeBytes = stats.size;
      lastModified = stats.mtime.toISOString();
    }
  } catch (err) {
    console.warn("[Backup] Could not read db file stats:", err);
  }

  const userCount = (sqlite.prepare("SELECT count(*) as count FROM users").get() as any)?.count || 0;
  const profileCount = (sqlite.prepare("SELECT count(*) as count FROM profiles").get() as any)?.count || 0;
  const invoiceCount = (sqlite.prepare("SELECT count(*) as count FROM invoices").get() as any)?.count || 0;
  const paymentCount = (sqlite.prepare("SELECT count(*) as count FROM payments").get() as any)?.count || 0;
  const settingsCount = (sqlite.prepare("SELECT count(*) as count FROM settings").get() as any)?.count || 0;

  return {
    fileSizeBytes,
    fileSizeFormatted: formatBytes(fileSizeBytes),
    dbPath,
    lastModified,
    counts: {
      users: userCount,
      profiles: profileCount,
      invoices: invoiceCount,
      payments: paymentCount,
      settings: settingsCount,
    },
  };
});

/**
 * 2. Create structured JSON snapshot backup of the database
 */
export const exportDatabaseBackupServerFn = createServerFn({ method: "GET" }).handler(async (): Promise<{
  success: boolean;
  backup?: BackupPayload;
  filename?: string;
  message?: string;
}> => {
  try {
    const users = sqlite.prepare("SELECT * FROM users").all() as any[];
    const profiles = sqlite.prepare("SELECT * FROM profiles").all() as any[];
    const invoices = sqlite.prepare("SELECT * FROM invoices").all() as any[];
    const payments = sqlite.prepare("SELECT * FROM payments").all() as any[];
    const settings = sqlite.prepare("SELECT * FROM settings").all() as any[];

    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `siakad-backup-${dateStr}.json`;

    const backup: BackupPayload = {
      app: "SIAKAD PONPES",
      version: "v26.10.17.014",
      exportDate: new Date().toISOString(),
      counts: {
        users: users.length,
        profiles: profiles.length,
        invoices: invoices.length,
        payments: payments.length,
        settings: settings.length,
      },
      data: {
        users,
        profiles,
        invoices,
        payments,
        settings,
      },
    };

    return {
      success: true,
      backup,
      filename,
    };
  } catch (err: any) {
    console.error("[Backup Error]:", err);
    return {
      success: false,
      message: err.message || "Gagal membuat cadangan database.",
    };
  }
});

/**
 * 3. Export raw SQLite file (.db) as Base64 for binary cold-backup
 */
export const exportRawSqliteDbServerFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    if (!fs.existsSync(dbPath)) {
      return { success: false, message: "File database SQLite tidak ditemukan." };
    }

    // Checkpoint WAL to flush pending transactions to the main siakad.db file
    try {
      sqlite.pragma("wal_checkpoint(TRUNCATE)");
    } catch {}

    const fileBuffer = fs.readFileSync(dbPath);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `siakad-database-${dateStr}.db`;

    return {
      success: true,
      filename,
      base64: fileBuffer.toString("base64"),
      sizeFormatted: formatBytes(fileBuffer.length),
    };
  } catch (err: any) {
    console.error("[Raw DB Export Error]:", err);
    return {
      success: false,
      message: err.message || "Gagal mengunduh file database SQLite.",
    };
  }
});

/**
 * 4. Restore database from JSON backup snapshot
 */
export const restoreDatabaseBackupServerFn = createServerFn({ method: "POST" })
  .validator((params: { backupJson: string; mode?: "replace" | "merge" }) => params)
  .handler(async ({ data: { backupJson, mode = "replace" } }) => {
    try {
      let parsed: BackupPayload;
      try {
        parsed = JSON.parse(backupJson);
      } catch {
        return { success: false, message: "File backup tidak valid: format JSON rusak atau tidak sesuai." };
      }

      if (!parsed.data || typeof parsed.data !== "object") {
        return { success: false, message: "Struktur file backup tidak valid: data tabel tidak ditemukan." };
      }

      const { users = [], profiles = [], invoices = [], payments = [], settings = [] } = parsed.data;

      // Execute in atomic transaction
      const runTransaction = sqlite.transaction(() => {
        if (mode === "replace") {
          // Clean existing data in reverse foreign key order
          sqlite.prepare("DELETE FROM payments").run();
          sqlite.prepare("DELETE FROM invoices").run();
          sqlite.prepare("DELETE FROM profiles").run();
          sqlite.prepare("DELETE FROM sessions").run();
          sqlite.prepare("DELETE FROM otp_codes").run();
          sqlite.prepare("DELETE FROM users").run();
          sqlite.prepare("DELETE FROM settings").run();
        }

        // 1. Restore Users
        const insertUser = sqlite.prepare(`
          INSERT OR REPLACE INTO users (id, email, password_hash, role, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const u of users) {
          if (u.id && u.email) {
            insertUser.run(
              u.id,
              String(u.email).trim().toLowerCase(),
              u.password_hash || null,
              u.role || "user",
              u.created_at || new Date().toISOString()
            );
          }
        }

        // 2. Restore Profiles
        const insertProfile = sqlite.prepare(`
          INSERT OR REPLACE INTO profiles (id, email, full_name, organization, phone, pic, address, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of profiles) {
          if (p.id && p.email) {
            insertProfile.run(
              p.id,
              String(p.email).trim().toLowerCase(),
              p.full_name || null,
              p.organization || null,
              p.phone || null,
              p.pic || null,
              p.address || null,
              p.created_at || new Date().toISOString()
            );
          }
        }

        // 3. Restore Invoices
        const insertInvoice = sqlite.prepare(`
          INSERT OR REPLACE INTO invoices (
            id, invoice_number, user_id, issue_date, due_date, status,
            items, tax_rate, discount, subtotal, total, notes, paid_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const inv of invoices) {
          if (inv.id && inv.invoice_number) {
            const itemsStr = typeof inv.items === "string" ? inv.items : JSON.stringify(inv.items || []);
            insertInvoice.run(
              inv.id,
              inv.invoice_number,
              inv.user_id,
              inv.issue_date,
              inv.due_date,
              inv.status || "unpaid",
              itemsStr,
              Number(inv.tax_rate) || 0,
              Number(inv.discount) || 0,
              Number(inv.subtotal) || 0,
              Number(inv.total) || 0,
              inv.notes || "",
              inv.paid_at || null,
              inv.created_at || new Date().toISOString()
            );
          }
        }

        // 4. Restore Payments
        const insertPayment = sqlite.prepare(`
          INSERT OR REPLACE INTO payments (
            id, invoice_id, user_id, amount, method, reference, status, paid_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const pm of payments) {
          if (pm.id && pm.invoice_id) {
            insertPayment.run(
              pm.id,
              pm.invoice_id,
              pm.user_id,
              Number(pm.amount) || 0,
              pm.method || "transfer",
              pm.reference || null,
              pm.status || "paid",
              pm.paid_at || new Date().toISOString(),
              pm.created_at || new Date().toISOString()
            );
          }
        }

        // 5. Restore Settings
        const insertSetting = sqlite.prepare(`
          INSERT OR REPLACE INTO settings (key, value, updated_at)
          VALUES (?, ?, ?)
        `);
        for (const st of settings) {
          if (st.key && st.value) {
            const valStr = typeof st.value === "string" ? st.value : JSON.stringify(st.value);
            insertSetting.run(st.key, valStr, st.updated_at || new Date().toISOString());
          }
        }
      });

      // Run transactional restore
      runTransaction();

      // Checkpoint WAL
      try {
        sqlite.pragma("wal_checkpoint(TRUNCATE)");
      } catch {}

      return {
        success: true,
        message: `Pemulihan database berhasil! Dipulihkan: ${users.length} pengguna, ${invoices.length} invoice, ${payments.length} pembayaran, dan ${settings.length} pengaturan sistem.`,
        restoredCounts: {
          users: users.length,
          invoices: invoices.length,
          payments: payments.length,
          settings: settings.length,
        },
      };
    } catch (err: any) {
      console.error("[Restore Error]:", err);
      return {
        success: false,
        message: err.message || "Gagal memulihkan database.",
      };
    }
  });
