import { Link } from "@tanstack/react-router";
import { rupiah, tanggal } from "@/lib/auth";
import { StatusBadge } from "./StatusBadge";

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total: number;
  customer?: string | null | undefined;
};

export function InvoiceTable({ rows, showCustomer = false }: { rows: InvoiceRow[]; showCustomer?: boolean }) {
  if (!rows.length)
    return <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">Belum ada invoice.</div>;
  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Invoice</th>
            {showCustomer && <th className="px-4 py-3">Pelanggan</th>}
            <th className="px-4 py-3">Tanggal</th>
            <th className="px-4 py-3">Jatuh Tempo</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t transition hover:bg-secondary/50">
              <td className="px-4 py-3 font-semibold">
                <Link to="/invoice/$id" params={{ id: r.id }} className="text-primary hover:underline">
                  #{r.invoice_number}
                </Link>
              </td>
              {showCustomer && <td className="px-4 py-3">{r.customer ?? "-"}</td>}
              <td className="px-4 py-3">{tanggal(r.issue_date)}</td>
              <td className="px-4 py-3">{tanggal(r.due_date)}</td>
              <td className="px-4 py-3 text-right font-medium">{rupiah(Number(r.total))}</td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
