import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  PlusCircle,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PageHeader, StatCard } from "@/components/AppShell";
import { InvoiceTable } from "@/components/InvoiceTable";
import { Button } from "@/components/ui/button";
import { rupiah } from "@/lib/auth";
import { useAdminInvoices, useAdminPayments, useProfiles } from "@/lib/admin-queries";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Admin — SIAKAD PONPES" },
      { name: "description", content: "Ringkasan invoice, pembayaran, grafik dan analisis pendapatan." },
      { property: "og:title", content: "Dashboard Admin — SIAKAD PONPES" },
      { property: "og:description", content: "Ringkasan invoice, pembayaran, grafik dan analisis pendapatan." },
    ],
  }),
  component: AdminDashboard,
});

const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#6b7280"];

function AdminDashboard() {
  const { data: invoices = [], isLoading: loadingInvoices } = useAdminInvoices();
  const { data: payments = [] } = useAdminPayments();
  const { data: profiles = [] } = useProfiles();
  const userCount = profiles.length;

  const unpaidInvoices = invoices.filter((i) => i.status === "unpaid");
  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const expiredInvoices = invoices.filter((i) => {
    if (i.status === "expired") return true;
    if (i.status === "unpaid" && i.due_date && new Date(i.due_date) < new Date()) return true;
    return false;
  });

  const totalInvoiceAmount = invoices.reduce((acc, i) => acc + Number(i.total || 0), 0);
  const totalPaidAmount = paidInvoices.reduce((acc, i) => acc + Number(i.total || 0), 0);
  const totalUnpaidAmount = unpaidInvoices.reduce((acc, i) => acc + Number(i.total || 0), 0);

  // Group revenue by month for the chart
  const monthlyDataMap: Record<string, { month: string; paid: number; unpaid: number; count: number }> = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  invoices.forEach((inv) => {
    const d = new Date(inv.issue_date || inv.created_at);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    if (!monthlyDataMap[key]) {
      monthlyDataMap[key] = { month: key, paid: 0, unpaid: 0, count: 0 };
    }
    monthlyDataMap[key].count += 1;
    if (inv.status === "paid") {
      monthlyDataMap[key].paid += Number(inv.total || 0);
    } else {
      monthlyDataMap[key].unpaid += Number(inv.total || 0);
    }
  });

  const chartData = Object.values(monthlyDataMap).slice(-6);

  const pieData = [
    { name: "Lunas", value: paidInvoices.length },
    { name: "Belum Bayar", value: unpaidInvoices.length },
    { name: "Pending", value: pendingInvoices.length },
    { name: "Kedaluwarsa", value: expiredInvoices.length },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard Admin"
        sub="Monitor performa tagihan, realisasi pembayaran, dan pengguna aktif."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/admin/invoices/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Buat Invoice Baru
              </Link>
            </Button>
          </div>
        }
      />

      {/* Row 1: Primary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Invoice"
          value={String(invoices.length)}
          subtext={`Total Nilai: ${rupiah(totalInvoiceAmount)}`}
          tone="default"
        />
        <StatCard
          label="Realisasi Lunas"
          value={rupiah(totalPaidAmount)}
          subtext={`${paidInvoices.length} invoice terselesaikan`}
          tone="green"
        />
        <StatCard
          label="Tagihan Belum Bayar"
          value={rupiah(totalUnpaidAmount)}
          subtext={`${unpaidInvoices.length} invoice menunggu`}
          tone="red"
        />
        <StatCard
          label="Total Lembaga & Klien"
          value={String(userCount)}
          subtext="Lembaga & Klien mitra terdaftar"
          tone="gold"
        />
      </div>

      {/* Row 2: Secondary Status Breakdown */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-muted-foreground truncate" title="Menunggu Pembayaran">Menunggu Bayar</span>
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold truncate leading-tight">{unpaidInvoices.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-muted-foreground truncate" title="Pembayaran Pending">Bayar Pending</span>
            <TrendingUp className="h-4 w-4 text-sky-500 shrink-0" />
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold truncate leading-tight">{pendingInvoices.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-muted-foreground truncate" title="Invoice Kedaluwarsa">Kedaluwarsa</span>
            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold truncate leading-tight">{expiredInvoices.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-muted-foreground truncate" title="Total Transaksi">Transaksi Selesai</span>
            <CreditCard className="h-4 w-4 text-emerald-500 shrink-0" />
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold truncate leading-tight">{payments.length}</p>
        </div>
      </div>

      {/* Row 3: Visual Analytics Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Revenue Chart */}
        <div className="rounded-2xl border bg-card p-6 shadow-xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Tren Pendapatan & Tagihan</h2>
              <p className="text-xs text-muted-foreground">Perbandingan invoice lunas vs belum dibayar</p>
            </div>
          </div>
          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} textAnchor="end" fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `Rp${(v / 1000000).toFixed(0)}M`}
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(val: number) => [rupiah(val), ""]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                  />
                  <Legend />
                  <Bar dataKey="paid" name="Lunas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unpaid" name="Belum Bayar" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Belum ada data grafik yang cukup.
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="rounded-2xl border bg-card p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Distribusi Status Invoice</h2>
            <p className="text-xs text-muted-foreground">Komposisi status invoice keseluruhan</p>
          </div>
          <div className="h-72 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada invoice</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Invoices Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Invoice Terbaru</h2>
            <p className="text-xs text-muted-foreground">Daftar transaksi dan tagihan yang baru diterbitkan</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/invoices">
              Lihat Semua Invoice <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <InvoiceTable rows={invoices.slice(0, 6)} showCustomer />
      </div>
    </div>
  );
}
