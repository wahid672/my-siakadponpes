import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { rupiah } from "@/lib/auth";

interface DeleteInvoiceSweetAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
  onConfirmDelete: (invoice: any) => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteInvoiceSweetAlertModal({
  open,
  onOpenChange,
  invoice,
  onConfirmDelete,
  isDeleting = false,
}: DeleteInvoiceSweetAlertModalProps) {
  const [confirmInput, setConfirmInput] = useState("");

  // Reset confirmation input when modal opens/closes
  useEffect(() => {
    if (open) {
      setConfirmInput("");
    }
  }, [open, invoice?.id]);

  if (!invoice) return null;

  const isConfirmed = confirmInput.trim().toLowerCase() === "delete";

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isDeleting) return;
    await onConfirmDelete(invoice);
  };

  const isPaid = invoice.status === "paid";

  return (
    <Dialog open={open} onOpenChange={(val) => !isDeleting && onOpenChange(val)}>
      <DialogContent className="max-w-md p-6 text-center sm:text-center">
        {/* SweetAlert Style Danger Icon */}
        <div className="mx-auto my-2 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 ring-8 ring-rose-50 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-950/20">
          <Trash2 className="h-8 w-8 text-rose-600 dark:text-rose-400 animate-pulse" />
        </div>

        <DialogHeader className="space-y-2 text-center">
          <DialogTitle className="text-xl font-bold text-foreground">
            Hapus Invoice #{invoice.invoice_number}?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Tindakan ini bersifat <strong>permanen</strong> dan data tidak dapat dipulihkan kembali.
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Summary Box */}
        <div className="mt-2 rounded-xl border bg-muted/40 p-3.5 text-left text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pelanggan:</span>
            <span className="font-semibold text-foreground truncate max-w-[200px]">
              {invoice.customer || invoice.customer_email || "Tanpa Nama"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Tagihan:</span>
            <span className="font-bold text-foreground font-mono">
              {rupiah(Number(invoice.total || 0))}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status Saat Ini:</span>
            <StatusBadge status={invoice.status} />
          </div>

          {isPaid && (
            <div className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5 leading-snug">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Perhatian:</strong> Invoice ini berstatus <strong>LUNAS</strong>. Menghapusnya juga akan menghapus riwayat transaksi pembayaran terkait.
              </span>
            </div>
          )}
        </div>

        {/* Confirmation Input Form */}
        <form onSubmit={handleConfirm} className="mt-4 space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-foreground block text-center">
              Ketik kata <span className="font-mono font-bold text-rose-600 underline">delete</span> untuk konfirmasi:
            </label>
            <Input
              type="text"
              autoFocus
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder='Ketik "delete"'
              disabled={isDeleting}
              className="text-center font-mono font-bold tracking-wider placeholder:font-normal placeholder:tracking-normal focus-visible:ring-rose-500 border-rose-200 dark:border-rose-900"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              <X className="mr-1.5 h-4 w-4" />
              Batal
            </Button>

            <Button
              type="submit"
              disabled={!isConfirmed || isDeleting}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Hapus Permanen
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
