import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { DEFAULT_GENERAL_SETTINGS, GeneralSettings } from "./settings";
import { DEFAULT_MANUAL_BANKS, ManualBankAccount } from "./manual-banks";
import { sqlite } from "./db";

export interface PublicInvoiceResult {
  success: boolean;
  invoice: any | null;
  settings?: GeneralSettings;
  manualBanks?: ManualBankAccount[];
  error?: string;
}

const ACTIVE_PAYMENT_PREFIX = "<!-- ACTIVE_PAYMENT: ";
const ACTIVE_PAYMENT_SUFFIX = " -->";

export function extractActivePayment(notes: string | null | undefined): any | null {
  if (!notes) return null;
  const startIdx = notes.indexOf(ACTIVE_PAYMENT_PREFIX);
  if (startIdx === -1) return null;
  const endIdx = notes.indexOf(ACTIVE_PAYMENT_SUFFIX, startIdx + ACTIVE_PAYMENT_PREFIX.length);
  if (endIdx === -1) return null;
  try {
    const jsonStr = notes.slice(startIdx + ACTIVE_PAYMENT_PREFIX.length, endIdx);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function cleanInvoiceNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  const startIdx = notes.indexOf(ACTIVE_PAYMENT_PREFIX);
  if (startIdx === -1) return notes.trim();
  const endIdx = notes.indexOf(ACTIVE_PAYMENT_SUFFIX, startIdx);
  if (endIdx === -1) return notes.slice(0, startIdx).trim();
  const before = notes.slice(0, startIdx);
  const after = notes.slice(endIdx + ACTIVE_PAYMENT_SUFFIX.length);
  return (before + after).trim();
}

export function embedActivePaymentInNotes(existingNotes: string | null | undefined, paymentData: any): string {
  const clean = cleanInvoiceNotes(existingNotes);
  const tag = `${ACTIVE_PAYMENT_PREFIX}${JSON.stringify(paymentData)}${ACTIVE_PAYMENT_SUFFIX}`;
  return clean ? `${clean}\n\n${tag}` : tag;
}

export const getPublicInvoiceServerFn = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<PublicInvoiceResult> => {
    let generalSettings: GeneralSettings = DEFAULT_GENERAL_SETTINGS;
    let manualBanks: ManualBankAccount[] = DEFAULT_MANUAL_BANKS;

    try {
      // 1. Fetch settings
      const settingsRow = sqlite.prepare("SELECT value FROM settings WHERE key = 'general'").get() as any;
      if (settingsRow?.value) {
        try {
          generalSettings = {
            ...DEFAULT_GENERAL_SETTINGS,
            ...JSON.parse(settingsRow.value),
          };
        } catch {}
      }

      // 2. Fetch manual banks
      const banksRow = sqlite.prepare("SELECT value FROM settings WHERE key = 'manual_banks'").get() as any;
      if (banksRow?.value) {
        try {
          const parsedBanks = JSON.parse(banksRow.value);
          if (Array.isArray(parsedBanks)) manualBanks = parsedBanks;
        } catch {}
      }

      // 3. Query invoice by ID or invoice_number
      const inv = sqlite
        .prepare("SELECT * FROM invoices WHERE id = ? OR invoice_number = ?")
        .get(id, id) as any;

      if (inv) {
        const profile = sqlite.prepare("SELECT * FROM profiles WHERE id = ?").get(inv.user_id) as any;
        const payments = sqlite
          .prepare("SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at ASC")
          .all(inv.id) as any[];

        let items = [];
        try {
          items = typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items || [];
        } catch {
          items = [];
        }

        const activePayment = extractActivePayment(inv.notes);
        const displayNotes = cleanInvoiceNotes(inv.notes);

        return {
          success: true,
          invoice: {
            ...inv,
            items,
            notes: displayNotes,
            active_payment: activePayment,
            profile,
            payments: payments || [],
          },
          settings: generalSettings,
          manualBanks,
        };
      }
    } catch (err) {
      console.error("[getPublicInvoiceServerFn Error]:", err);
    }

    return {
      success: false,
      invoice: null,
      settings: generalSettings,
      manualBanks,
      error: "Invoice tidak ditemukan",
    };
  });

export const saveActivePaymentServerFn = createServerFn({ method: "POST" })
  .validator((params: { invoiceId: string; paymentData: any }) => params)
  .handler(async ({ data }) => {
    const { invoiceId, paymentData } = data;
    try {
      const currentInv = sqlite
        .prepare("SELECT notes FROM invoices WHERE id = ? OR invoice_number = ?")
        .get(invoiceId, invoiceId) as any;

      if (!currentInv) return { success: false, error: "Invoice tidak ditemukan" };

      const newNotes = embedActivePaymentInNotes(currentInv.notes, paymentData);
      sqlite
        .prepare("UPDATE invoices SET notes = ? WHERE id = ? OR invoice_number = ?")
        .run(newNotes, invoiceId, invoiceId);

      return { success: true };
    } catch (err: any) {
      console.error("[saveActivePaymentServerFn Error]:", err);
      return { success: false, error: err.message };
    }
  });

export const completePublicPaymentServerFn = createServerFn({ method: "POST" })
  .validator((params: { invoiceId: string; amount: number; method: string; reference: string }) => params)
  .handler(async ({ data }) => {
    try {
      const inv = sqlite
        .prepare("SELECT * FROM invoices WHERE id = ? OR invoice_number = ?")
        .get(data.invoiceId, data.invoiceId) as any;

      if (!inv) return { success: false, message: "Invoice tidak ditemukan" };

      const cleanNotes = cleanInvoiceNotes(inv.notes);
      const now = new Date().toISOString();

      sqlite
        .prepare("UPDATE invoices SET status = 'paid', paid_at = ?, notes = ? WHERE id = ?")
        .run(now, cleanNotes, inv.id);

      const paymentId = "pm-" + crypto.randomUUID();
      sqlite
        .prepare(
          `INSERT INTO payments (id, invoice_id, user_id, amount, method, reference, status, paid_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?)`
        )
        .run(paymentId, inv.id, inv.user_id, data.amount, data.method, data.reference, now, now);

      return { success: true };
    } catch (err: any) {
      console.error("[completePublicPaymentServerFn Error]:", err);
      return { success: false, message: err.message };
    }
  });
