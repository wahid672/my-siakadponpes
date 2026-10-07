import { InvoiceStatus, PaymentStatus } from "@/lib/domain-types";

const statusMap: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground border-border" },
  unpaid: { label: "Belum Bayar", cls: "bg-destructive/10 text-destructive border-destructive/20" },
  pending: { label: "Pending", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  paid: { label: "Lunas", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" },
  expired: { label: "Kedaluwarsa", cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  cancelled: { label: "Dibatalkan", cls: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
  failed: { label: "Gagal", cls: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const normalized = (status || "").toLowerCase();
  const item = statusMap[normalized] ?? { label: status || "Unknown", cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${item.cls} ${className}`}>
      {item.label}
    </span>
  );
}
