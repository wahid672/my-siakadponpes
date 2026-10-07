import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, ExternalLink, Calendar, CheckCircle2 } from "lucide-react";
import { getUserPaymentsServerFn } from "@/lib/data-server";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { rupiah, tanggal } from "@/lib/auth";

export const Route = createFileRoute("/_user/payments")({
  head: () => ({
    meta: [
      { title: "Riwayat Pembayaran Saya — SIAKAD PONPES" },
      { name: "description", content: "Histori bukti dan transaksi pembayaran invoice Anda." },
      { property: "og:title", content: "Riwayat Pembayaran Saya — SIAKAD PONPES" },
      { property: "og:description", content: "Histori bukti dan transaksi pembayaran invoice Anda." },
    ],
  }),
  component: UserPayments,
});

function UserPayments() {
  const { auth } = Route.useRouteContext();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["my-payments", auth.userId],
    queryFn: async () => {
      return await getUserPaymentsServerFn({ data: auth.userId });
    },
  });

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Pembayaran Saya"
        sub="Catatan transaksi pelunasan invoice dan tagihan yang telah diverifikasi."
      />

      <div className="rounded-xl border bg-card p-5 max-w-sm shadow-xs">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Total Dana Terbayar</p>
        <p className="mt-2 text-2xl font-bold text-emerald-600">{rupiah(totalPaid)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{payments.length} transaksi selesai</p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat riwayat pembayaran...</div>
      ) : payments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Belum ada transaksi pembayaran yang tercatat.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">No. Invoice</th>
                <th className="px-4 py-3">Metode Bayar</th>
                <th className="px-4 py-3">No. Referensi</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.id} className="transition hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground">{tanggal(p.paid_at)}</td>
                  <td className="px-4 py-3 font-semibold">
                    <Link
                      to="/invoice/$id"
                      params={{ id: p.invoice_id }}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      #{p.invoice_number} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 uppercase text-xs font-medium text-foreground">
                    {p.method || "Transfer / Tripay"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {p.reference || p.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">{rupiah(Number(p.amount))}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status="paid" />
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
