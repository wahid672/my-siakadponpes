import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  Calendar,
  X,
  Loader2,
  RefreshCw,
  Building2,
  CreditCard,
  Banknote,
  ExternalLink,
} from "lucide-react";
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
import {
  getCachedManualBankAccounts,
  getManualBankAccounts,
  getCachedManualTransferEnabled,
  getManualTransferEnabled,
  ManualBankAccount,
} from "@/lib/manual-banks";
import { getCachedTripaySettings, getTripaySettings } from "@/lib/settings";
import {
  getCachedTripayChannels,
  fetchTripayChannels,
} from "@/lib/tripay";
import { PaymentChannelItem } from "@/lib/domain-types";

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
  const [method, setMethod] = useState("");

  const [manualBanks, setManualBanks] = useState<ManualBankAccount[]>(() =>
    getCachedManualBankAccounts()
  );
  const [isManualEnabled, setIsManualEnabled] = useState<boolean>(() =>
    getCachedManualTransferEnabled()
  );
  const [tripayChannels, setTripayChannels] = useState<PaymentChannelItem[]>(() =>
    getCachedTripayChannels()
  );
  const [isTripayEnabled, setIsTripayEnabled] = useState<boolean>(() =>
    getCachedTripaySettings().isEnabled
  );

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

      // Sinkronkan daftar rekening manual dan saluran Tripay terkini
      getManualBankAccounts().then((banks) => {
        if (Array.isArray(banks) && banks.length > 0) setManualBanks(banks);
      });
      getManualTransferEnabled().then((en) => {
        setIsManualEnabled(en);
      });
      getTripaySettings().then((cfg) => {
        setIsTripayEnabled(cfg.isEnabled);
      });
      fetchTripayChannels(false).then((res) => {
        if (res?.channels && Array.isArray(res.channels) && res.channels.length > 0) {
          setTripayChannels(res.channels);
        }
      });
    }
  }, [open, invoice?.id]);

  const activeManualBanks = isManualEnabled
    ? manualBanks.filter((b) => b.isActive !== false)
    : [];

  const activeTripayChannels = isTripayEnabled
    ? tripayChannels.filter((c) => c.active !== false)
    : [];

  // Set default method ketika modal dibuka atau data saluran dimuat
  useEffect(() => {
    if (!open) return;

    if (activeManualBanks.length > 0) {
      const defaultBank = activeManualBanks[0];
      setMethod(`${defaultBank.bankName} - ${defaultBank.accountNumber} a.n. ${defaultBank.accountHolder}`);
    } else if (activeTripayChannels.length > 0) {
      setMethod(`${activeTripayChannels[0].name} (Tripay)`);
    } else {
      setMethod("Tunai / Cash (Langsung ke Bendahara)");
    }
  }, [open, isManualEnabled, isTripayEnabled, manualBanks.length, tripayChannels.length]);

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

  // Cek apakah metode yang dipilih adalah salah satu rekening bank manual
  const selectedManualBank = activeManualBanks.find(
    (b) => method === `${b.bankName} - ${b.accountNumber} a.n. ${b.accountHolder}`
  );

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="max-w-md p-6 sm:p-7 max-h-[92vh] overflow-y-auto">
        {/* Top Success Badge Icon */}
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-950/20">
          <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
        </div>

        <DialogHeader className="space-y-1.5 text-center">
          <DialogTitle className="text-lg font-bold text-foreground">
            Tandai Lunas Invoice #{invoice.invoice_number}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pilih metode pembayaran yang tersedia dan atur tanggal serta waktu transaksi.
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

        {/* Form Pilih Tanggal, Jam, Menit, Detik & Saluran Pembayaran */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-3">
            {/* Pilihan Saluran Pembayaran Tersedia */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Saluran Pembayaran Tersedia</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {activeManualBanks.length + activeTripayChannels.length} metode aktif
                </span>
              </Label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
              >
                {/* Grup 1: Rekening Bank Manual */}
                {activeManualBanks.length > 0 && (
                  <optgroup label="🏦 Rekening Transfer Bank Manual">
                    {activeManualBanks.map((b) => {
                      const val = `${b.bankName} - ${b.accountNumber} a.n. ${b.accountHolder}`;
                      return (
                        <option key={b.id || b.accountNumber} value={val}>
                          {b.bankName} - {b.accountNumber} (a.n. {b.accountHolder})
                        </option>
                      );
                    })}
                  </optgroup>
                )}

                {/* Grup 2: Saluran Pembayaran Tripay Gateway */}
                {activeTripayChannels.length > 0 && (
                  <optgroup label="⚡ Saluran Pembayaran Otomatis (Tripay)">
                    {activeTripayChannels.map((c) => {
                      const val = `${c.name} (Tripay)`;
                      return (
                        <option key={c.code} value={val}>
                          {c.name} ({c.code})
                        </option>
                      );
                    })}
                  </optgroup>
                )}

                {/* Grup 3: Pembayaran Tunai / Langsung */}
                <optgroup label="💵 Metode Langsung / Lainnya">
                  <option value="Tunai / Cash (Langsung ke Bendahara)">
                    Tunai / Cash (Langsung ke Bendahara)
                  </option>
                  <option value="Transfer Manual / Kasir">Transfer Manual / Kasir</option>
                </optgroup>
              </select>

              {/* Rincian Rekening Bank Terpilih */}
              {selectedManualBank && (
                <div className="rounded-lg border bg-card p-2.5 text-xs space-y-1 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{selectedManualBank.bankName}</span>
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      No. Rek: <span className="font-mono font-semibold text-foreground">{selectedManualBank.accountNumber}</span>
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      Atas Nama: <span className="font-medium text-foreground">{selectedManualBank.accountHolder}</span>
                    </div>
                  </div>
                  {selectedManualBank.logoUrl && (
                    <img
                      src={selectedManualBank.logoUrl}
                      alt={selectedManualBank.bankName}
                      className="h-7 w-auto object-contain max-w-[70px] opacity-90"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Tanggal Transaksi */}
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
                  <span className="text-[10px] text-muted-foreground font-medium block text-center">
                    Jam (00-23)
                  </span>
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
                  <span className="text-[10px] text-muted-foreground font-medium block text-center">
                    Menit (00-59)
                  </span>
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
                  <span className="text-[10px] text-muted-foreground font-medium block text-center">
                    Detik (00-59)
                  </span>
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

            {/* Live Preview Box */}
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs space-y-1">
              <div className="text-[11px] text-muted-foreground">Tampilan di Lembar Invoice:</div>
              <div className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                📅 {previewFormatted}
              </div>
              <div className="text-[11px] text-foreground font-medium truncate">
                💳 {method}
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
