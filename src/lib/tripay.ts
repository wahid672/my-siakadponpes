import { PaymentChannelItem } from "./domain-types";

export const DEFAULT_TRIPAY_CHANNELS: PaymentChannelItem[] = [
  {
    code: "QRIS",
    name: "QRIS by ShopeePay (Semua E-Wallet & Mobile Banking)",
    group: "QRIS",
    type: "direct",
    fee_merchant: { flat: 0, percent: 0 },
    fee_customer: { flat: 750, percent: 0.7 },
    total_fee: { flat: 750, percent: 0.7 },
    icon_url: "https://assets.tripay.co.id/upload/payment-icon/BpE4BPVyIw1605597490.png",
    active: true,
  },
  {
    code: "BRIVA",
    name: "BRI Virtual Account",
    group: "Virtual Account",
    type: "direct",
    fee_merchant: { flat: 4250, percent: 0 },
    fee_customer: { flat: 0, percent: 0 },
    total_fee: { flat: 4250, percent: 0 },
    icon_url: "https://assets.tripay.co.id/upload/payment-icon/8WQ3APST5s1579461828.png",
    active: true,
  },
  {
    code: "BNIVA",
    name: "BNI Virtual Account",
    group: "Virtual Account",
    type: "direct",
    fee_merchant: { flat: 212.5, percent: 0 },
    fee_customer: { flat: 4037.5, percent: 0 },
    total_fee: { flat: 4250, percent: 0 },
    icon_url: "https://assets.tripay.co.id/upload/payment-icon/n22Qsh8jMa1583433577.png",
    active: true,
  },
  {
    code: "MANDIRIVA",
    name: "Mandiri Virtual Account",
    group: "Virtual Account",
    type: "direct",
    fee_merchant: { flat: 0, percent: 0 },
    fee_customer: { flat: 4250, percent: 0 },
    total_fee: { flat: 4250, percent: 0 },
    icon_url: "https://assets.tripay.co.id/upload/payment-icon/T9Z012UE331583531536.png",
    active: true,
  },
  {
    code: "BSIVA",
    name: "BSI Virtual Account (Bank Syariah)",
    group: "Virtual Account",
    type: "direct",
    fee_merchant: { flat: 4250, percent: 0 },
    fee_customer: { flat: 0, percent: 0 },
    total_fee: { flat: 4250, percent: 0 },
    icon_url: "https://assets.tripay.co.id/upload/payment-icon/tEclz5Assb1643375216.png",
    active: true,
  },
  {
    code: "PERMATAVA",
    name: "Permata Virtual Account",
    group: "Virtual Account",
    type: "direct",
    fee_merchant: { flat: 0, percent: 0 },
    fee_customer: { flat: 4250, percent: 0 },
    total_fee: { flat: 4250, percent: 0 },
    icon_url: "https://assets.tripay.co.id/upload/payment-icon/szezRhAALB1583408731.png",
    active: true,
  },
  {
    code: "MUAMALATVA",
    name: "Muamalat Virtual Account",
    group: "Virtual Account",
    type: "direct",
    fee_merchant: { flat: 0, percent: 0 },
    fee_customer: { flat: 4250, percent: 0 },
    total_fee: { flat: 4250, percent: 0 },
    icon_url: "https://assets.tripay.co.id/upload/payment-icon/GGwwcgdYaG1611929720.png",
    active: true,
  },
  {
    code: "CIMBVA",
    name: "CIMB Niaga Virtual Account",
    group: "Virtual Account",
    type: "direct",
    fee_merchant: { flat: 0, percent: 0 },
    fee_customer: { flat: 4250, percent: 0 },
    total_fee: { flat: 4250, percent: 0 },
    icon_url: "https://assets.tripay.co.id/upload/payment-icon/WtEJwfuphn1614003973.png",
    active: true,
  },
  {
    code: "ALFAMART",
    name: "Alfamart / Alfamidi",
    group: "Convenience Store",
    type: "direct",
    fee_merchant: { flat: 0, percent: 0 },
    fee_customer: { flat: 3500, percent: 0 },
    total_fee: { flat: 3500, percent: 0 },
    icon_url: "https://assets.tripay.co.id/upload/payment-icon/jiGZMKp2RD1583433506.png",
    active: true,
  },
  {
    code: "INDOMARET",
    name: "Indomaret",
    group: "Convenience Store",
    type: "direct",
    fee_merchant: { flat: 0, percent: 0 },
    fee_customer: { flat: 3500, percent: 0 },
    total_fee: { flat: 3500, percent: 0 },
    icon_url: "https://assets.tripay.co.id/upload/payment-icon/zNzuO5AuLw1583513974.png",
    active: true,
  },
  {
    code: "OVO",
    name: "OVO E-Wallet",
    group: "E-Wallet",
    type: "redirect",
    fee_merchant: { flat: 0, percent: 0 },
    fee_customer: { flat: 0, percent: 3 },
    total_fee: { flat: 0, percent: 3 },
    icon_url: "https://assets.tripay.co.id/upload/payment-icon/fH6Y7wDT171586199243.png",
    active: true,
  },
];

export const STORAGE_TRIPAY_CHANNELS_KEY = "siakad_tripay_channels";

export function getCachedTripayChannels(): PaymentChannelItem[] {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(STORAGE_TRIPAY_CHANNELS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return DEFAULT_TRIPAY_CHANNELS;
}

export async function fetchTripayChannels(forceRefresh = false): Promise<{
  success: boolean;
  channels: PaymentChannelItem[];
  source: "tripay_api" | "database" | "default";
  message?: string;
}> {
  try {
    const { getTripayChannelsServerFn } = await import("./tripay-server");
    const res = await getTripayChannelsServerFn({ data: { forceRefresh } });
    if (res.success && Array.isArray(res.channels)) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_TRIPAY_CHANNELS_KEY, JSON.stringify(res.channels));
        window.dispatchEvent(
          new CustomEvent("tripay_channels_updated", { detail: res.channels })
        );
      }
      return res;
    }
  } catch (err: any) {
    console.warn("[Tripay] fetchTripayChannels error:", err);
  }
  return {
    success: true,
    channels: getCachedTripayChannels(),
    source: "default",
  };
}

import { getTripaySettings, DEFAULT_TRIPAY_CONFIG } from "./settings";

export function getTripayBaseUrl(mode: "sandbox" | "production" = "sandbox") {
  return mode === "production"
    ? "https://tripay.co.id/api"
    : "https://tripay.co.id/api-sandbox";
}

export function getTripayConfig() {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("siakad_tripay_settings");
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          mode: parsed.mode || "sandbox",
          merchantCode: parsed.merchantCode || DEFAULT_TRIPAY_CONFIG.merchantCode,
          apiKey: parsed.apiKey || DEFAULT_TRIPAY_CONFIG.apiKey,
          privateKey: parsed.privateKey || DEFAULT_TRIPAY_CONFIG.privateKey,
        };
      }
    } catch {}
  }

  const mode = ((typeof import.meta !== "undefined" && import.meta.env?.VITE_TRIPAY_MODE) ||
    (typeof process !== "undefined" && process.env?.TRIPAY_MODE) ||
    "sandbox") as "sandbox" | "production";

  const merchantCode =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_TRIPAY_MERCHANT_CODE) ||
    (typeof process !== "undefined" && process.env?.TRIPAY_MERCHANT_CODE) ||
    DEFAULT_TRIPAY_CONFIG.merchantCode;

  const apiKey =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_TRIPAY_API_KEY) ||
    (typeof process !== "undefined" && process.env?.TRIPAY_API_KEY) ||
    DEFAULT_TRIPAY_CONFIG.apiKey;

  const privateKey =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_TRIPAY_PRIVATE_KEY) ||
    (typeof process !== "undefined" && process.env?.TRIPAY_PRIVATE_KEY) ||
    DEFAULT_TRIPAY_CONFIG.privateKey;

  return { mode, merchantCode, apiKey, privateKey };
}

/**
 * Generates Tripay transaction signature for closed transaction
 * Formula: HMAC-SHA256(merchant_code + merchant_ref + amount, private_key)
 */
export async function createTripaySignature(
  merchantCode: string,
  merchantRef: string,
  amount: number,
  privateKey: string
): Promise<string> {
  const payload = `${merchantCode}${merchantRef}${amount}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(payload)
  );
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface TripayOrderItem {
  sku?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface TripayCreateTransactionParams {
  method: string;
  merchantRef: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  orderItems: TripayOrderItem[];
  callbackUrl?: string;
  returnUrl?: string;
}

export interface TripayTransactionResponse {
  reference: string;
  merchant_ref: string;
  payment_selection_type: string;
  payment_method: string;
  payment_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  callback_url: string;
  return_url: string;
  amount: number;
  fee_merchant: number;
  fee_customer: number;
  total_fee: number;
  amount_received: number;
  pay_code?: string;
  pay_url?: string;
  checkout_url: string;
  status: string;
  expired_time: number;
  qr_string?: string;
  qr_url?: string;
  instructions: Array<{ title: string; steps: string[] }>;
}

/**
 * Sends a real HTTP request to Tripay API to create transaction
 */
export async function createTripayTransaction(
  params: TripayCreateTransactionParams,
  overrideConfig?: {
    merchantCode?: string;
    apiKey?: string;
    privateKey?: string;
    mode?: "sandbox" | "production";
  }
): Promise<{ success: boolean; data?: TripayTransactionResponse; message?: string }> {
  // Try server function first to avoid browser CORS blocks
  try {
    const { createTripayTransactionServerFn } = await import("./tripay-server");
    return await createTripayTransactionServerFn({ data: params });
  } catch (fnErr) {
    console.warn("[Tripay] createTripayTransactionServerFn fallback to direct fetch:", fnErr);
  }

  const dbConfig = await getTripaySettings();
  const config = {
    ...getTripayConfig(),
    merchantCode: dbConfig.merchantCode,
    apiKey: dbConfig.apiKey,
    privateKey: dbConfig.privateKey,
    mode: dbConfig.mode,
    ...overrideConfig,
  };
  const baseUrl = getTripayBaseUrl(config.mode);

  try {
    const signature = await createTripaySignature(
      config.merchantCode,
      params.merchantRef,
      params.amount,
      config.privateKey
    );

    const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
    const roundedAmount = Math.round(params.amount);

    // Sanitize order_items to strictly equal amount
    let finalOrderItems = params.orderItems && params.orderItems.length > 0 ? [...params.orderItems] : [];
    const itemsSum = finalOrderItems.reduce(
      (sum, it) => sum + Math.round(Number(it.price || 0)) * Math.round(Number(it.quantity || 1)),
      0
    );

    if (finalOrderItems.length === 0 || itemsSum !== roundedAmount) {
      if (finalOrderItems.length === 1) {
        finalOrderItems = [
          {
            sku: finalOrderItems[0].sku || params.merchantRef,
            name: finalOrderItems[0].name,
            price: roundedAmount,
            quantity: 1,
          },
        ];
      } else if (finalOrderItems.length > 1 && itemsSum > 0) {
        let runningTotal = 0;
        finalOrderItems = finalOrderItems.map((it, idx) => {
          const qty = Math.max(1, Math.round(Number(it.quantity || 1)));
          if (idx === finalOrderItems.length - 1) {
            const remaining = Math.max(0, roundedAmount - runningTotal);
            return {
              ...it,
              price: Math.max(1, Math.round(remaining / qty)),
              quantity: qty,
            };
          }
          const scaledPrice = Math.max(1, Math.round((Number(it.price) * roundedAmount) / itemsSum));
          runningTotal += scaledPrice * qty;
          return {
            ...it,
            price: scaledPrice,
            quantity: qty,
          };
        });
      } else {
        finalOrderItems = [
          {
            sku: params.merchantRef,
            name: "Tagihan SIAKAD PONPES",
            price: roundedAmount,
            quantity: 1,
          },
        ];
      }
    }

    const payload = {
      method: params.method,
      merchant_ref: params.merchantRef,
      amount: roundedAmount,
      customer_name: params.customerName || "Pelanggan SIAKAD",
      customer_email: params.customerEmail || "pelanggan@siakadponpes.com",
      customer_phone: params.customerPhone || "081234567890",
      order_items: finalOrderItems,
      callback_url:
        params.callbackUrl ||
        (typeof window !== "undefined"
          ? `${window.location.origin}/api/payment/tripay/callback`
          : "http://localhost:3000/api/payment/tripay/callback"),
      return_url:
        params.returnUrl ||
        (typeof window !== "undefined" ? window.location.href : "http://localhost:3000"),
      expired_time: expiredTime,
      signature: signature,
    };

    const res = await fetch(`${baseUrl}/transaction/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!json.success) {
      return {
        success: false,
        message: json.message || "Gagal membuat transaksi di server Tripay",
      };
    }

    return {
      success: true,
      data: json.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Koneksi ke gateway Tripay gagal",
    };
  }
}

/**
 * Validates Tripay callback HMAC-SHA256 signature
 */
export async function verifyTripaySignature(
  rawBody: string,
  incomingSignature: string,
  privateKey: string
): Promise<boolean> {
  if (!rawBody || !incomingSignature || !privateKey) return false;
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(privateKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(rawBody)
    );
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const calculatedHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return calculatedHex.toLowerCase() === incomingSignature.toLowerCase();
  } catch {
    return false;
  }
}
