import { createServerFn } from "@tanstack/react-start";
import {
  getTripayBaseUrl,
  createTripaySignature,
  TripayCreateTransactionParams,
  TripayTransactionResponse,
} from "./tripay";
import { getTripaySettings } from "./settings";

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
