import React from "react";
import { CheckCircle2 } from "lucide-react";

export interface PaymentRecord {
  id?: string;
  paid_at?: string | null;
  method?: string | null;
  amount?: number | null;
  reference?: string | null;
}

interface InvoicePaymentTableProps {
  status: string;
  paidAt?: string | null;
  createdAt?: string | null;
  total: number;
  invoiceNumber?: string;
  payments?: PaymentRecord[] | null;
  activePayment?: {
    channel?: string;
    accountHolder?: string;
    payCode?: string;
    isManual?: boolean;
    reference?: string;
  } | null;
  className?: string;
}

/** Formats date & time to Indonesian standard: "21 Agustus 2025, 10:05:43" */
export function formatTanggalWaktu(dateInput?: string | Date | null): string {
  if (!dateInput) return "-";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const dateStr = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = d
    .toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/\./g, ":");

  return `${dateStr}, ${timeStr}`;
}

/** Formats nominal currency with standard cents: "Rp. 8.500.000,00" */
export function formatNominal(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount || 0)
    .replace("Rp", "Rp.");
}

/** Formats payment method for user-friendly receipt presentation */
export function formatPaymentMethod(method?: string | null, reference?: string | null): string {
  if (!method) return "Transfer Manual";
  const m = method.trim();

  const tripayChannelMap: Record<string, string> = {
    BRIVA: "BRI Virtual Account",
    BCAVA: "BCA Virtual Account",
    BNIVA: "BNI Virtual Account",
    MANDIRIVA: "Mandiri Virtual Account",
    PERMATAVA: "Permata Virtual Account",
    BSIVA: "BSI Virtual Account",
    CIMBVA: "CIMB Niaga Virtual Account",
    MUAMALATVA: "Muamalat Virtual Account",
    DANAMONVA: "Danamon Virtual Account",
    QRIS: "QRIS (Pembayaran Instan)",
    QRIS2: "QRIS",
    OVO: "OVO E-Wallet",
    DANA: "DANA E-Wallet",
    SHOPEEPAY: "ShopeePay E-Wallet",
    ALFAMART: "Gerai Alfamart",
    INDOMARET: "Gerai Indomaret",
  };

  const cleanUpper = m.toUpperCase().replace(/^TRIPAY\s+/, "");
  if (tripayChannelMap[cleanUpper]) {
    return `${tripayChannelMap[cleanUpper]} (Tripay)`;
  }

  if (m.toLowerCase() === "manual_admin" || m.toLowerCase() === "manual / cash") {
    return "Transfer Manual / Kasir";
  }

  return m;
}

export function InvoicePaymentTable({
  status,
  paidAt,
  createdAt,
  total,
  invoiceNumber,
  payments,
  activePayment,
  className = "",
}: InvoicePaymentTableProps) {
  // Only display when invoice status is paid
  if (status !== "paid") return null;

  // Determine row data: prefer database payments; if empty, create fallback row from invoice paid data
  const hasDbPayments = Array.isArray(payments) && payments.length > 0;
  const rows: PaymentRecord[] = hasDbPayments
    ? (payments as PaymentRecord[])
    : [
        {
          id: "default-paid",
          paid_at: paidAt || createdAt || new Date().toISOString(),
          method: activePayment
            ? activePayment.accountHolder && activePayment.payCode
              ? `${activePayment.payCode} - ${activePayment.accountHolder}`
              : activePayment.channel || "Transfer Manual"
            : "Transfer Manual",
          amount: total,
          reference: invoiceNumber,
        },
      ];

  const generatedDate = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <section className={`mt-8 border-t pt-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Rincian Transaksi Pembayaran
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 stroke-[2.5]" /> Lunas Terverifikasi
        </span>
      </div>

      {/* Styled Payment History Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-foreground font-semibold">
              <th className="p-2.5 sm:px-3.5 sm:py-2.5 border-r border-border min-w-[160px] sm:min-w-[190px]">
                Tanggal Transaksi
              </th>
              <th className="p-2.5 sm:px-3.5 sm:py-2.5 border-r border-border min-w-[200px]">
                Metode Pembayaran
              </th>
              <th className="p-2.5 sm:px-3.5 sm:py-2.5 text-right min-w-[120px]">
                Nominal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <tr key={row.id || idx} className="hover:bg-muted/15 transition-colors">
                <td className="p-2.5 sm:px-3.5 sm:py-2.5 border-r border-border text-muted-foreground whitespace-nowrap">
                  {formatTanggalWaktu(row.paid_at || paidAt)}
                </td>
                <td className="p-2.5 sm:px-3.5 sm:py-2.5 border-r border-border font-medium text-foreground">
                  <div>{formatPaymentMethod(row.method, row.reference)}</div>
                  {row.reference && (
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Ref: {row.reference}
                    </div>
                  )}
                </td>
                <td className="p-2.5 sm:px-3.5 sm:py-2.5 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                  {formatNominal(Number(row.amount ?? total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground text-center">
        Generated on {generatedDate}
      </p>
    </section>
  );
}
