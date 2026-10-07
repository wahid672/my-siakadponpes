import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, CreditCard, ExternalLink, Filter, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { rupiah, tanggal } from "@/lib/auth";
import { useAdminPayments } from "@/lib/admin-queries";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Riwayat Pembayaran — SIAKAD PONPES" },
      { name: "description", content: "Daftar transaksi pembayaran invoice via Tripay dan transfer manual." },
      { property: "og:title", content: "Riwayat Pembayaran — SIAKAD PONPES" },
      { property: "og:description", content: "Daftar transaksi pembayaran invoice via Tripay dan transfer manual." },
    ],
  }),
  component: AdminPayments,
});

function AdminPayments() {
  const { data = [], isLoading } = useAdminPayments();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = data.filter((p) => {
    const matchesSearch =
      (p.invoice_number ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.reference ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.method ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || (p.status ?? "paid") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCollected = data
    .filter((p) => (p.status ?? "paid") === "paid")
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Pembayaran"
        sub="Monitor seluruh transaksi masuk dari santri, wali, dan mitra pesantren."
      />

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Total Dana Masuk</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{rupiah(totalCollected)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{data.length} transaksi tercatat</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Metode Terpopuler</p>
          <p className="mt-2 text-2xl font-bold">QRIS & VA</p>
          <p className="mt-1 text-xs text-muted-foreground">Otomatisasi via Tripay Gateway</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Status Transaksi</p>
          <p className="mt-2 text-2xl font-bold text-primary">100% Valid</p>
          <p className="mt-1 text-xs text-muted-foreground">Verifikasi server-side & webhook</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari referensi, invoice, atau pembayar..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {[
            { id: "all", label: "Semua" },
            { id: "paid", label: "Berhasil / Lunas" },
            { id: "pending", label: "Pending" },
          ].map((s) => (
            <Button
              key={s.id}
              size="sm"
              variant={statusFilter === s.id ? "default" : "outline"}
              onClick={() => setStatusFilter(s.id)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat riwayat transaksi...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Belum ada riwayat pembayaran yang tercatat.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">No. Invoice</th>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Metode / Saluran</th>
                <th className="px-4 py-3">Referensi Transaksi</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((pm) => (
                <tr key={pm.id} className="transition hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {tanggal(pm.paid_at || pm.created_at)}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <Link
                      to="/invoice/$id"
                      params={{ id: pm.invoice_id }}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      #{pm.invoice_number} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{pm.customer_name}</p>
                    {pm.customer_email && <p className="text-xs text-muted-foreground">{pm.customer_email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium uppercase">
                      <CreditCard className="h-3 w-3" /> {pm.method || "Transfer / Tripay"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {pm.reference || pm.id.slice(0, 12)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">
                    {rupiah(Number(pm.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={pm.status || "paid"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
