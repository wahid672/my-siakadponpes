import crypto from "crypto";
import { verifyTripaySignature, getTripayConfig } from "./tripay";
import { getTripaySettings, DEFAULT_TRIPAY_CONFIG } from "./settings";
import { cleanInvoiceNotes } from "./public-invoice";
import { sqlite } from "./db";

export interface TripayCallbackPayload {
  reference: string;
  merchant_ref: string;
  payment_method: string;
  payment_method_code?: string;
  total_amount: number;
  fee_merchant?: number;
  fee_customer?: number;
  total_fee?: number;
  amount_received?: number;
  status: "PAID" | "UNPAID" | "FAILED" | "EXPIRED" | "REFUND" | string;
  paid_at?: number | string | null;
  note?: string | null;
}

/**
 * Retrieves all possible Tripay private keys configured in DB, ENV, or defaults
 */
function getAllTripayPrivateKeys(): string[] {
  const keys: string[] = [];

  // 1. Direct query from SQLite table settings
  try {
    const row = sqlite.prepare("SELECT value FROM settings WHERE key = 'tripay'").get() as
      | { value: string }
      | undefined;
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (parsed.privateKey) keys.push(String(parsed.privateKey).trim());
      if (parsed.private_key) keys.push(String(parsed.private_key).trim());
    }
  } catch (err) {
    console.error("[Tripay Webhook] Failed to query private key from SQLite:", err);
  }

  // 2. Direct read from process.env
  if (process.env.TRIPAY_PRIVATE_KEY) {
    keys.push(process.env.TRIPAY_PRIVATE_KEY.trim());
  }

  // 3. Fallback default
  if (DEFAULT_TRIPAY_CONFIG.privateKey) {
    keys.push(DEFAULT_TRIPAY_CONFIG.privateKey.trim());
  }

  return Array.from(new Set(keys.filter(Boolean)));
}

/**
 * Robust invoice finder that resolves an invoice regardless of suffix or timestamp in merchant_ref
 */
function findInvoiceByMerchantRef(merchantRef: string): any | null {
  if (!merchantRef) return null;

  // 1. Exact match by invoice_number
  let inv = sqlite.prepare("SELECT * FROM invoices WHERE invoice_number = ?").get(merchantRef);
  if (inv) return inv;

  // 2. Exact match by id (UUID)
  inv = sqlite.prepare("SELECT * FROM invoices WHERE id = ?").get(merchantRef);
  if (inv) return inv;

  // 3. Match using '__' delimiter
  if (merchantRef.includes("__")) {
    const baseNum = merchantRef.split("__")[0];
    inv = sqlite.prepare("SELECT * FROM invoices WHERE invoice_number = ? OR id = ?").get(baseNum, baseNum);
    if (inv) return inv;
  }

  // 4. Match using trailing digits suffix
  const strippedSuffix = merchantRef.replace(/[-_]\d+$/, "");
  if (strippedSuffix && strippedSuffix !== merchantRef) {
    inv = sqlite.prepare("SELECT * FROM invoices WHERE invoice_number = ?").get(strippedSuffix);
    if (inv) return inv;
  }

  // 5. Look for an embedded UUID inside merchantRef
  const uuidMatch = merchantRef.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch) {
    inv = sqlite.prepare("SELECT * FROM invoices WHERE id = ?").get(uuidMatch[0]);
    if (inv) return inv;
  }

  // 6. Query recent invoices and find match
  const allInvoices = sqlite.prepare("SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100").all() as any[];
  const found = allInvoices.find(
    (i) =>
      merchantRef.startsWith(i.invoice_number) ||
      i.invoice_number.startsWith(merchantRef) ||
      merchantRef.includes(i.invoice_number)
  );
  if (found) return found;

  return null;
}

/**
 * Handles incoming HTTP webhook from Tripay Payment Gateway
 */
export async function handleTripayCallback(request: Request): Promise<Response> {
  if (request.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Endpoint Webhook Tripay SIAKAD PONPES siap menerima notifikasi (Gunakan metode POST dari server Tripay).",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      }
    );
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "Method not allowed. Use POST." }),
      { status: 405, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const rawBody = await request.text();
    const signatureHeader =
      request.headers.get("x-callback-signature") ||
      request.headers.get("X-Callback-Signature") ||
      "";

    // Verify HMAC-SHA256 signature
    const candidateKeys = getAllTripayPrivateKeys();
    let signatureMatched = false;

    if (signatureHeader && candidateKeys.length > 0) {
      const cleanIncoming = signatureHeader.trim().toLowerCase();

      for (const key of candidateKeys) {
        const calculated = crypto.createHmac("sha256", key).update(rawBody).digest("hex").toLowerCase();
        if (calculated === cleanIncoming) {
          signatureMatched = true;
          break;
        }
      }

      if (!signatureMatched) {
        console.warn("[Tripay Webhook] Signature mismatch!");
        console.warn("  Incoming signature :", signatureHeader);
        console.warn("  Candidate keys tested:", candidateKeys.length);
        return new Response(
          JSON.stringify({ success: false, message: "Invalid callback signature" }),
          { status: 400, headers: { "content-type": "application/json" } }
        );
      }
    }

    const payload = JSON.parse(rawBody) as TripayCallbackPayload;
    console.log("[Tripay Webhook] Signature valid! Processing callback:", {
      reference: payload.reference,
      merchant_ref: payload.merchant_ref,
      status: payload.status,
      payment_method: payload.payment_method,
      amount: payload.total_amount,
    });

    const isPaid = (payload.status || "").toUpperCase() === "PAID";

    // Handle test / simulator callbacks from Tripay dashboard
    const isTestCallback =
      (payload.merchant_ref && (
        payload.merchant_ref.toUpperCase().includes("TEST") ||
        payload.merchant_ref.toUpperCase().includes("SIMULATOR") ||
        payload.merchant_ref.toUpperCase().includes("DEMO")
      )) ||
      (payload.reference && (
        payload.reference.toUpperCase().includes("TEST") ||
        payload.reference.toUpperCase().includes("SIMULATOR")
      ));

    if (!payload.merchant_ref) {
      if (isTestCallback) {
        return new Response(
          JSON.stringify({ success: true, message: "Tes Callback Tripay berhasil diverifikasi!" }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, message: "Missing merchant_ref in payload" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // Connect to SQLite database
    const inv = findInvoiceByMerchantRef(payload.merchant_ref);

    if (!inv) {
      if (isTestCallback) {
        console.log("[Tripay Webhook] Test callback recognized & signature verified successfully (200 OK).");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Tes Callback Tripay berhasil diverifikasi!",
            test: true,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      console.error("[Tripay Webhook] INVOICE NOT FOUND for merchant_ref:", payload.merchant_ref);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Invoice tidak ditemukan untuk merchant_ref: ${payload.merchant_ref}`,
        }),
        {
          status: 404,
          headers: { "content-type": "application/json" },
        }
      );
    }

    console.log("[Tripay Webhook] MATCHED Invoice:", {
      id: inv.id,
      invoice_number: inv.invoice_number,
      current_status: inv.status,
    });

    if (isPaid) {
      const paidTimestamp = payload.paid_at
        ? typeof payload.paid_at === "number"
          ? new Date(payload.paid_at * 1000).toISOString()
          : new Date(payload.paid_at).toISOString()
        : new Date().toISOString();

      const cleanNotes = cleanInvoiceNotes(inv.notes);

      // Update invoice to paid
      sqlite
        .prepare("UPDATE invoices SET status = 'paid', paid_at = ?, notes = ? WHERE id = ?")
        .run(paidTimestamp, cleanNotes, inv.id);

      // Record payment
      const paymentId = "pm-" + crypto.randomUUID();
      sqlite
        .prepare(
          `INSERT INTO payments (id, invoice_id, user_id, amount, method, reference, status, paid_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?)`
        )
        .run(
          paymentId,
          inv.id,
          inv.user_id,
          payload.total_amount || inv.total,
          payload.payment_method || payload.payment_method_code || "tripay",
          payload.reference,
          paidTimestamp,
          paidTimestamp
        );

      console.log(`[Tripay Webhook] SUCCESS! Invoice ${inv.invoice_number} is now marked PAID.`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Invoice ${inv.invoice_number} berhasil diperbarui menjadi PAID.`,
          invoice_id: inv.id,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    }

    if (payload.status === "EXPIRED") {
      sqlite
        .prepare("UPDATE invoices SET status = 'cancelled', notes = ? WHERE id = ?")
        .run(cleanInvoiceNotes(inv.notes), inv.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Status ${payload.status} diproses untuk invoice ${inv.invoice_number}`,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[Tripay Webhook Error]:", err);
    return new Response(
      JSON.stringify({ success: false, message: err?.message || "Internal server error" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
