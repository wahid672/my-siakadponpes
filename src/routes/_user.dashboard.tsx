import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserInvoicesServerFn } from "@/lib/data-server";
import { PageHeader, StatCard } from "@/components/AppShell";
import { InvoiceTable } from "@/components/InvoiceTable";
import { Button } from "@/components/ui/button";
import { rupiah } from "@/lib/auth";

export const Route = createFileRoute("/_user/dashboard")({
  head: () => ({
    meta: [
      { title: "Tagihan Saya — SIAKAD PONPES" },
      { name: "description", content: "Ringkasan tagihan, invoice, dan status pembayaran Anda." },
      { property: "og:title", content: "Tagihan Saya — SIAKAD PONPES" },
      { property: "og:description", content: "Ringkasan tagihan, invoice, dan status pembayaran Anda." },
    ],
  }),
  component: UserDashboard,
});

function UserDashboard() {
  const { auth } = Route.useRouteContext();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-invoices", auth.userId],
    queryFn: async () => {
      return await getUserInvoicesServerFn({ data: auth.userId });
    },
  });

  const unpaid = data.filter((i) => i.status === "unpaid");
  const paid = data.filter((i) => i.status === "paid");
  const pending = data.filter((i) => i.status === "pending");
  const expired = data.filter((i) => {
    if (i.status === "expired") return true;
    if (i.status === "unpaid" && i.due_date && new Date(i.due_date) < new Date()) return true;
    return false;
  });

  const filtered = data.filter((i) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "expired") {
      return i.status === "expired" || (i.status === "unpaid" && i.due_date && new Date(i.due_date) < new Date());
    }
    return i.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tagihan Saya"
        sub="Ringkasan seluruh tagihan invoice dan status pembayaran Anda."
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Tagihan"
          value={String(data.length)}
          subtext={`Akumulasi: ${rupiah(data.reduce((s, i) => s + Number(i.total || 0), 0))}`}
          tone="default"
        />
        <StatCard
          label="Belum Dibayar"
          value={rupiah(unpaid.reduce((s, i) => s + Number(i.total || 0), 0))}
          subtext={`${unpaid.length} invoice belum diselesaikan`}
          tone="red"
        />
        <StatCard
          label="Sudah Lunas"
          value={rupiah(paid.reduce((s, i) => s + Number(i.total || 0), 0))}
          subtext={`${paid.length} invoice terbayar`}
          tone="green"
        />
        <StatCard
          label="Menunggu Konfirmasi"
          value={String(pending.length)}
          subtext={`${expired.length} invoice kedaluwarsa`}
          tone="amber"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pt-2">
        {[
          { id: "all", label: "Semua" },
          { id: "unpaid", label: "Belum Bayar" },
          { id: "pending", label: "Pending" },
          { id: "paid", label: "Lunas" },
          { id: "expired", label: "Kedaluwarsa" },
        ].map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={statusFilter === f.id ? "default" : "outline"}
            onClick={() => setStatusFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat tagihan...</div>
      ) : (
        <InvoiceTable rows={filtered} />
      )}
    </div>
  );
}
