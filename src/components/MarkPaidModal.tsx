import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, Calendar, X, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { rupiah } from "@/lib/auth";
import { formatTanggalWaktu } from "@/components/InvoicePaymentTable";

interface MarkPaidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
  onConfirm: (data: { paidAt: string; method: string }) => Promise<void>;
  isSubmitting?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function MarkPaidModal({
  open,
  onOpenChange,
  invoice,
  onConfirm,
  isSubmitting = false,
}: MarkPaidModalProps) {
  const [dateStr, setDateStr] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [method, setMethod] = useState("Transfer Bank Manual");

  const resetToNow = () => {
    const now = new Date();
    setDateStr(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    setHours(pad(now.getHours()));
    setMinutes(pad(now.getMinutes()));
    setSeconds(pad(now.getSeconds()));
  };

  useEffect(() => {
    if (open) {
      resetToNow();
      setMethod("Transfer Bank Manual");
    }
  }, [open, invoice?.id]);

  if (!invoice) return null;

  const constructDate = () => {
    if (!dateStr) return new Date();
    const h = Math.min(23, Math.max(0, parseInt(hours || "0", 10)));
    const m = Math.min(59, Math.max(0, parseInt(minutes || "0", 10)));
    const s = Math.min(59, Math.max(0, parseInt(seconds || "0", 10)));
    const parts = dateStr.split("-").map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return new Date();
    }
    return new Date(parts[0], parts[1] - 1, parts[2], h, m, s);
  };

  const previewDate = constructDate();
  const previewFormatted = formatTanggalWaktu(previewDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const finalDate = constructDate();
    await onConfirm({
      paidAt: finalDate.toISOString(),
      method: method.trim() || "Transfer Bank Manual",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="max-w-md p-6 sm:p-7">
        {/* Top Success Badge Icon */}
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-950/20">
          <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>

        <DialogHeader className="space-y-1.5 text-center">
          <DialogTitle className="text-lg font-bold text-foreground">
            Tandai Lunas Invoice #{invoice.invoice_number}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Atur tanggal dan waktu transaksi pelunasan yang akan tercantum pada invoice.
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Brief Information */}
        <div className="mt-2 rounded-xl border bg-muted/30 p-3 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Pelanggan:</span>
            <span className="font-semibold text-foreground truncate max-w-[210px]">
              {invoice.customer || invoice.customer_email || "Pelanggan"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total Tagihan:</span>
            <span className="font-bold text-foreground font-mono">
              {rupiah(Number(invoice.total || 0))}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status Saat Ini:</span>
            <StatusBadge status={invoice.status} />
          </div>
        </div>

        {/* Form Pilih Tanggal, Jam, Menit, Detik */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-3">
            {/* Tanggal */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Tanggal Transaksi
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetToNow}
                  className="h-6 text-[11px] text-primary hover:text-primary gap-1 px-1.5"
                >
                  <RefreshCw className="h-3 w-3" /> Waktu Sekarang
                </Button>
              </div>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-9 text-sm"
              />
            </div>

            {/* Jam, Menit, Detik */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Waktu (Jam : Menit : Detik)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-medium block text-center">Jam (00-23)</span>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={hours}
                    onChange={(e) => setHours(e.target.value.padStart(2, "0").slice(-2))}
                    placeholder="00"
                    disabled={isSubmitting}
                    className="h-9 text-center font-mono font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-medium block text-center">Menit (00-59)</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value.padStart(2, "0").slice(-2))}
                    placeholder="00"
                    disabled={isSubmitting}
                    className="h-9 text-center font-mono font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-medium block text-center">Detik (00-59)</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value.padStart(2, "0").slice(-2))}
                    placeholder="00"
                    disabled={isSubmitting}
                    className="h-9 text-center font-mono font-bold text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Metode Pembayaran</Label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Transfer Bank Manual">Transfer Bank Manual</option>
                <option value="Tunai / Cash">Tunai / Cash</option>
                <option value="QRIS Resmi">QRIS Resmi</option>
                <option value="Tripay Gateway">Tripay Gateway</option>
                <option value="Lainnya">Lainnya / Admin</option>
              </select>
            </div>

            {/* Live Preview Box */}
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs">
              <div className="text-[11px] text-muted-foreground mb-0.5">Tampilan Tanggal Transaksi di Invoice:</div>
              <div className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                {previewFormatted}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              <X className="mr-1.5 h-4 w-4" /> Batal
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Simpan & Lunas
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
