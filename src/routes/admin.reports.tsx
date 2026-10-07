import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAdminInvoices, useAdminPayments } from "@/lib/admin-queries";
import { rupiah, tanggal } from "@/lib/auth";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Laporan Keuangan — SIAKAD PONPES" },
      { name: "description", content: "Laporan rekapitulasi penerimaan tagihan dan invoice." },
      { property: "og:title", content: "Laporan Keuangan — SIAKAD PONPES" },
      { property: "og:description", content: "Laporan rekapitulasi penerimaan tagihan dan invoice." },
    ],
  }),
  component: AdminReports,
});

function AdminReports() {
  const { data: invoices = [] } = useAdminInvoices();
  const { data: payments = [] } = useAdminPayments();
  const [period, setPeriod] = useState("all");

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const unpaidInvoices = invoices.filter((i) => i.status === "unpaid");

  const totalInvoiced = invoices.reduce((acc, i) => acc + Number(i.total || 0), 0);
  const totalReceived = paidInvoices.reduce((acc, i) => acc + Number(i.total || 0), 0);
  const totalOutstanding = unpaidInvoices.reduce((acc, i) => acc + Number(i.total || 0), 0);

  function exportCSV() {
    if (invoices.length === 0) return toast.error("Tidak ada data untuk diekspor");

    const headers = ["No. Invoice", "Pelanggan", "Tgl Terbit", "Jatuh Tempo", "Total (Rp)", "Status"];
    const rows = invoices.map((i) => [
      i.invoice_number,
      `"${(i.customer ?? "").replace(/"/g, '""')}"`,
      i.issue_date,
      i.due_date,
      i.total,
      i.status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Invoice_SIAKAD_PONPES_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("File CSV berhasil diunduh");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Rekapitulasi"
        sub="Analisis keuangan, perolehan kas, dan tagihan aktif SIAKAD PONPES."
        action={
          <Button onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" /> Ekspor ke CSV
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Total Tagihan Diterbitkan</p>
          <p className="mt-2 text-2xl font-bold">{rupiah(totalInvoiced)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{invoices.length} invoice dibuat</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Realisasi Penerimaan (Lunas)</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{rupiah(totalReceived)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{paidInvoices.length} invoice lunas</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Piutang Belum Bayar</p>
          <p className="mt-2 text-2xl font-bold text-rose-600">{rupiah(totalOutstanding)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{unpaidInvoices.length} invoice tertunda</p>
        </div>
      </div>

      {/* Performance Summary Table */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
        <h2 className="text-base font-semibold">Ringkasan Berdasarkan Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Status Tagihan</th>
                <th className="px-4 py-3 text-center">Jumlah Invoice</th>
                <th className="px-4 py-3 text-right">Total Akumulasi</th>
                <th className="px-4 py-3 text-right">Persentase (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { status: "Lunas", count: paidInvoices.length, total: totalReceived, color: "text-emerald-600" },
                { status: "Belum Bayar", count: unpaidInvoices.length, total: totalOutstanding, color: "text-rose-600" },
              ].map((row, idx) => {
                const percent = totalInvoiced > 0 ? ((row.total / totalInvoiced) * 100).toFixed(1) : 0;
                return (
                  <tr key={idx} className="transition hover:bg-muted/20">
                    <td className={`px-4 py-3 font-semibold ${row.color}`}>{row.status}</td>
                    <td className="px-4 py-3 text-center font-medium">{row.count}</td>
                    <td className="px-4 py-3 text-right font-bold">{rupiah(row.total)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{percent}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
