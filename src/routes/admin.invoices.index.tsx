import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  Share2,
  Copy,
  XCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { rupiah, tanggal } from "@/lib/auth";
import { useAdminInvoices } from "@/lib/admin-queries";
import {
  updateInvoiceStatusServerFn,
  markInvoicePaidServerFn,
  duplicateInvoiceServerFn,
} from "@/lib/data-server";

export const Route = createFileRoute("/admin/invoices/")({
  head: () => ({
    meta: [
      { title: "Kelola Invoice — SIAKAD PONPES" },
      { name: "description", content: "Daftar, buat, duplikasi, dan kelola semua invoice tagihan." },
      { property: "og:title", content: "Kelola Invoice — SIAKAD PONPES" },
      { property: "og:description", content: "Daftar, buat, duplikasi, dan kelola semua invoice tagihan." },
    ],
  }),
  component: AdminInvoices,
});

function AdminInvoices() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useAdminInvoices();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = data.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSearch =
      r.invoice_number.toLowerCase().includes(q.toLowerCase()) ||
      (r.customer ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (r.customer_email ?? "").toLowerCase().includes(q.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  async function cancelInvoice(id: string) {
    if (!confirm("Apakah Anda yakin ingin membatalkan invoice ini?")) return;
    const res = await updateInvoiceStatusServerFn({ data: { id, status: "cancelled" } });
    if (!res.success) return void toast.error(res.message);
    toast.success("Invoice telah dibatalkan");
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
  }

  async function markAsPaid(id: string, total: number, userId: string) {
    if (!confirm("Tandai invoice ini sebagai lunas secara manual?")) return;
    const res = await markInvoicePaidServerFn({ data: { id, total, userId } });
    if (!res.success) return void toast.error(res.message);
    toast.success("Invoice ditandai lunas");
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
  }

  async function duplicateInvoice(inv: any) {
    const res = await duplicateInvoiceServerFn({ data: inv });
    if (!res.success) return void toast.error(res.message);
    toast.success(res.message);
    qc.invalidateQueries({ queryKey: ["admin-invoices"] });
  }

  function shareWhatsApp(inv: any) {
    const shareUrl = `${window.location.origin}/invoice/${inv.id}`;
    const text =
      `*Tagihan SIAKAD PONPES*\n` +
      `No. Invoice: #${inv.invoice_number}\n` +
      `Total: ${rupiah(Number(inv.total))}\n` +
      `Status: ${inv.status.toUpperCase()}\n\n` +
      `Lihat dan bayar invoice Anda melalui tautan resmi:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Invoice"
        sub={`Total ${data.length} invoice terdata dalam sistem.`}
        action={
          <Button asChild>
            <Link to="/admin/invoices/new">
              <Plus className="mr-2 h-4 w-4" /> Buat Invoice Baru
            </Link>
          </Button>
        }
      />

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nomor invoice atau pelanggan..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "Semua" },
            { id: "unpaid", label: "Belum Bayar" },
            { id: "pending", label: "Pending" },
            { id: "paid", label: "Lunas" },
            { id: "expired", label: "Kedaluwarsa" },
            { id: "cancelled", label: "Dibatalkan" },
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

      {/* Invoice Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat daftar invoice...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Tidak ada invoice yang ditemukan.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">No. Invoice</th>
                <th className="px-4 py-3">Pelanggan / Lembaga</th>
                <th className="px-4 py-3">Tgl Terbit</th>
                <th className="px-4 py-3">Jatuh Tempo</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id} className="transition hover:bg-muted/30">
                  <td className="px-4 py-3 font-semibold">
                    <Link to="/invoice/$id" params={{ id: r.id }} className="text-primary hover:underline">
                      #{r.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{r.customer ?? "-"}</div>
                    {r.customer_email && <div className="text-xs text-muted-foreground">{r.customer_email}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{tanggal(r.issue_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tanggal(r.due_date)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{rupiah(Number(r.total))}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link to="/invoice/$id" params={{ id: r.id }}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Lihat Invoice
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => shareWhatsApp(r)}>
                          <Share2 className="mr-2 h-4 w-4" /> Bagikan WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateInvoice(r)}>
                          <Copy className="mr-2 h-4 w-4" /> Duplikasi Invoice
                        </DropdownMenuItem>
                        {r.status === "unpaid" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => markAsPaid(r.id, Number(r.total), r.user_id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Tandai Lunas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => cancelInvoice(r.id)} className="text-destructive">
                              <XCircle className="mr-2 h-4 w-4" /> Batalkan Invoice
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
