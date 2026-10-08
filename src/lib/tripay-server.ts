import { createServerFn } from "@tanstack/react-start";
import {
  getTripayBaseUrl,
  createTripaySignature,
  TripayCreateTransactionParams,
  TripayTransactionResponse,
  DEFAULT_TRIPAY_CHANNELS,
} from "./tripay";
import { getTripaySettings } from "./settings";
import { PaymentChannelItem } from "./domain-types";
import { sqlite } from "./db";

export interface TestTripayResult {
  success: boolean;
  message: string;
  channelsCount?: number;
  channels?: Array<{ code: string; name: string; group: string }>;
}

/**
 * Server function to test Tripay API connection without CORS restrictions
 */
export const testTripayConnectionServerFn = createServerFn({ method: "POST" })
  .validator((params: { mode: "sandbox" | "production"; apiKey: string }) => params)
  .handler(async ({ data: { mode, apiKey } }): Promise<TestTripayResult> => {
    const baseUrl = getTripayBaseUrl(mode);
    const key = apiKey.trim();

    try {
      const res = await fetch(`${baseUrl}/merchant/payment-channel`, {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.success) {
        const channels = (json.data || []).map((c: any) => ({
          code: c.code,
          name: c.name,
          group: c.group,
        }));

        // Persist full channels to SQLite settings
        try {
          const fullChannels: PaymentChannelItem[] = (json.data || []).map((c: any) => ({
            code: String(c.code),
            name: String(c.name),
            group: (c.group as any) || "Virtual Account",
            type: String(c.type || "direct"),
            fee_merchant: {
              flat: Number(c.fee_merchant?.flat || 0),
              percent: Number(c.fee_merchant?.percent || 0),
            },
            fee_customer: {
              flat: Number(c.fee_customer?.flat || 0),
              percent: Number(c.fee_customer?.percent || 0),
            },
            total_fee: {
              flat: Number(c.total_fee?.flat || 0),
              percent: Number(c.total_fee?.percent || 0),
            },
            minimum_fee: c.minimum_fee !== undefined ? Number(c.minimum_fee) : undefined,
            maximum_fee: c.maximum_fee !== undefined ? Number(c.maximum_fee) : undefined,
            icon_url: c.icon_url || undefined,
            active: c.active !== false,
          }));
          sqlite
            .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('tripay_channels', ?, ?)")
            .run(JSON.stringify(fullChannels), new Date().toISOString());
        } catch (dbErr) {
          console.warn("[Tripay] Failed to cache channels on test connection:", dbErr);
        }

        return {
          success: true,
          message: `Berhasil terhubung ke Tripay ${mode.toUpperCase()}! Terdeteksi ${channels.length} saluran pembayaran aktif.`,
          channelsCount: channels.length,
          channels,
        };
      }

      return {
        success: false,
        message: json?.message || `HTTP ${res.status}: Gagal terhubung ke Tripay. Periksa kembali API Key.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Gagal menghubungi server Tripay.",
      };
    }
  });

/**
 * Server function to create a Tripay transaction without CORS restrictions
 */
export const createTripayTransactionServerFn = createServerFn({ method: "POST" })
  .validator((params: TripayCreateTransactionParams) => params)
  .handler(async ({ data: params }): Promise<{ success: boolean; data?: TripayTransactionResponse; message?: string }> => {
    const dbConfig = await getTripaySettings();
    if (!dbConfig.isEnabled) {
      return {
        success: false,
        message: "Layanan pembayaran otomatis (Tripay) sedang dinonaktifkan oleh administrator.",
      };
    }
    const baseUrl = getTripayBaseUrl(dbConfig.mode);

    try {
      const signature = await createTripaySignature(
        dbConfig.merchantCode,
        params.merchantRef,
        params.amount,
        dbConfig.privateKey
      );

      const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours

      const roundedAmount = Math.round(params.amount);

      // Sanitize and ensure order_items consistency with amount (strictly required by Tripay)
      let finalOrderItems = params.orderItems && params.orderItems.length > 0 ? [...params.orderItems] : [];
      const itemsSum = finalOrderItems.reduce(
        (sum, it) => sum + Math.round(Number(it.price || 0)) * Math.round(Number(it.quantity || 1)),
        0
      );

      if (finalOrderItems.length === 0 || itemsSum !== roundedAmount) {
        if (finalOrderItems.length === 1) {
          // Single item with discount or tax: set price to exact total amount
          finalOrderItems = [
            {
              sku: finalOrderItems[0].sku || params.merchantRef,
              name: finalOrderItems[0].name,
              price: roundedAmount,
              quantity: 1,
            },
          ];
        } else if (finalOrderItems.length > 1 && itemsSum > 0) {
          // Proportional scaling for multiple items after discount/tax
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
          // Fallback single line item
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
          `${process.env.APP_URL || "http://localhost:3000"}/api/payment/tripay/callback`,
        return_url: params.returnUrl || (process.env.APP_URL || "http://localhost:3000"),
        expired_time: expiredTime,
        signature: signature,
      };

      const res = await fetch(`${baseUrl}/transaction/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dbConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!json || !json.success) {
        return {
          success: false,
          message: json?.message || `HTTP ${res.status}: Gagal membuat transaksi di server Tripay`,
        };
      }

      return {
        success: true,
        data: json.data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Koneksi server ke gateway Tripay gagal",
      };
    }
  });

/**
 * Server function to fetch active payment channels directly from Tripay API,
 * cached in SQLite settings ('tripay_channels').
 */
export const getTripayChannelsServerFn = createServerFn({ method: "POST" })
  .validator((params?: { forceRefresh?: boolean }) => params || {})
  .handler(async ({ data } = { data: {} }): Promise<{
    success: boolean;
    channels: PaymentChannelItem[];
    source: "tripay_api" | "database" | "default";
    message?: string;
  }> => {
    const forceRefresh = Boolean(data?.forceRefresh);
    const dbConfig = await getTripaySettings();

    // 1. If not forceRefresh, try SQLite cache first
    if (!forceRefresh) {
      try {
        const cachedRow = sqlite.prepare("SELECT value FROM settings WHERE key = 'tripay_channels'").get() as any;
        if (cachedRow?.value) {
          const parsed = JSON.parse(cachedRow.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return {
              success: true,
              channels: parsed,
              source: "database",
            };
          }
        }
      } catch (err) {
        console.warn("[Tripay] Error reading cached channels:", err);
      }
    }

    // 2. Fetch fresh from Tripay API if API key is configured
    if (dbConfig.apiKey && dbConfig.apiKey.trim()) {
      try {
        const baseUrl = getTripayBaseUrl(dbConfig.mode);
        const res = await fetch(`${baseUrl}/merchant/payment-channel`, {
          headers: {
            Authorization: `Bearer ${dbConfig.apiKey.trim()}`,
          },
        });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.success && Array.isArray(json.data) && json.data.length > 0) {
          const fetchedChannels: PaymentChannelItem[] = json.data.map((c: any) => ({
            code: String(c.code),
            name: String(c.name),
            group: (c.group as any) || "Virtual Account",
            type: String(c.type || "direct"),
            fee_merchant: {
              flat: Number(c.fee_merchant?.flat || 0),
              percent: Number(c.fee_merchant?.percent || 0),
            },
            fee_customer: {
              flat: Number(c.fee_customer?.flat || 0),
              percent: Number(c.fee_customer?.percent || 0),
            },
            total_fee: {
              flat: Number(c.total_fee?.flat || 0),
              percent: Number(c.total_fee?.percent || 0),
            },
            minimum_fee: c.minimum_fee !== undefined ? Number(c.minimum_fee) : undefined,
            maximum_fee: c.maximum_fee !== undefined ? Number(c.maximum_fee) : undefined,
            icon_url: c.icon_url || undefined,
            active: c.active !== false,
          }));

          // Persist to SQLite
          try {
            sqlite
              .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('tripay_channels', ?, ?)")
              .run(JSON.stringify(fetchedChannels), new Date().toISOString());
          } catch (dbErr) {
            console.warn("[Tripay] Failed to write tripay_channels to DB:", dbErr);
          }

          const activeCount = fetchedChannels.filter((c) => c.active).length;
          return {
            success: true,
            channels: fetchedChannels,
            source: "tripay_api",
            message: `Berhasil memuat ${activeCount} saluran pembayaran aktif dari akun Tripay (${dbConfig.mode.toUpperCase()}).`,
          };
        } else if (json?.message) {
          console.warn("[Tripay] API responded with error:", json.message);
        }
      } catch (apiErr: any) {
        console.warn("[Tripay] Error connecting to Tripay API:", apiErr.message);
      }
    }

    // 3. Fallback: try cached from DB
    try {
      const cachedRow = sqlite.prepare("SELECT value FROM settings WHERE key = 'tripay_channels'").get() as any;
      if (cachedRow?.value) {
        const parsed = JSON.parse(cachedRow.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            success: true,
            channels: parsed,
            source: "database",
          };
        }
      }
    } catch {}

    // 4. Fallback to DEFAULT_TRIPAY_CHANNELS
    return {
      success: true,
      channels: DEFAULT_TRIPAY_CHANNELS,
      source: "default",
      message: "Menggunakan saluran pembayaran standar.",
    };
  });
