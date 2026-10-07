import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { History, Shield, Search, Calendar } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { tanggal } from "@/lib/auth";

export const Route = createFileRoute("/admin/audit-logs")({
  head: () => ({
    meta: [
      { title: "Log Audit Aktivitas — SIAKAD PONPES" },
      { name: "description", content: "Catatan riwayat aktivitas operasional dan keamanan sistem admin." },
      { property: "og:title", content: "Log Audit Aktivitas — SIAKAD PONPES" },
      { property: "og:description", content: "Catatan riwayat aktivitas operasional dan keamanan sistem admin." },
    ],
  }),
  component: AuditLogsPage,
});

interface LogItem {
  id: string;
  adminEmail: string;
  action: string;
  entity: string;
  details: string;
  timestamp: string;
}

const SAMPLE_LOGS: LogItem[] = [
  {
    id: "log-1",
    adminEmail: "wahidalimudin672@gmail.com",
    action: "LOGIN",
    entity: "AUTH",
    details: "Admin berhasil login via OTP",
    timestamp: new Date().toISOString(),
  },
  {
    id: "log-2",
    adminEmail: "wahidalimudin672@gmail.com",
    action: "UPDATE_CONFIG",
    entity: "PAYMENT_GATEWAY",
    details: "Mengubah konfigurasi mode Tripay Sandbox",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "log-3",
    adminEmail: "wahidalimudin672@gmail.com",
    action: "CREATE_INVOICE",
    entity: "INVOICE",
    details: "Menerbitkan invoice baru dengan nominal otomatis",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "log-4",
    adminEmail: "wahidalimudin672@gmail.com",
    action: "MARK_PAID",
    entity: "PAYMENT",
    details: "Konfirmasi pelunasan tagihan secara manual",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
];

function AuditLogsPage() {
  const [logs] = useState<LogItem[]>(SAMPLE_LOGS);
  const [search, setSearch] = useState("");

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log Audit & Aktivitas"
        sub="Pencatatan rekam jejak aksi sensitif admin dan sistem demi keamanan serta kepatuhan audit."
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari aksi atau entitas..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Administrator</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">Entitas</th>
              <th className="px-4 py-3">Rincian Perubahan</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((l) => (
              <tr key={l.id} className="transition hover:bg-muted/20">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {tanggal(l.timestamp)} {new Date(l.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 font-medium text-xs text-foreground">{l.adminEmail}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                    {l.action}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.entity}</td>
                <td className="px-4 py-3 text-xs text-foreground">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
