import { useState, useEffect } from "react";
import { Plus, Trash2, Save, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { rupiah } from "@/lib/auth";
import { updateInvoiceItemsServerFn } from "@/lib/data-server";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface EditInvoiceItemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any | null;
  onSuccess: () => void;
}

export function EditInvoiceItemsDialog({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: EditInvoiceItemsDialogProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (invoice) {
      const rawItems = Array.isArray(invoice.items)
        ? invoice.items
        : typeof invoice.items === "string"
        ? JSON.parse(invoice.items || "[]")
        : [];

      const initialItems: InvoiceItem[] =
        rawItems.length > 0
          ? rawItems.map((it: any) => ({
              description: it.description || "",
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || 0,
              amount: (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
            }))
          : [
              {
                description: "",
                quantity: 1,
                unit_price: 0,
                amount: 0,
              },
            ];

      setItems(initialItems);
      setTaxRate(Number(invoice.tax_rate) || 0);
      setDiscount(Number(invoice.discount) || 0);
      setNotes(invoice.notes || "");
    }
  }, [invoice, isOpen]);

  // Calculations
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );
  const taxAmount = (subtotal * (Number(taxRate) || 0)) / 100;
  const total = Math.max(0, subtotal + taxAmount - (Number(discount) || 0));

  function handleItemChange(
    index: number,
    field: "description" | "quantity" | "unit_price",
    value: any
  ) {
    setItems((prev) => {
      const copy = [...prev];
      const cur = { ...copy[index] };
      if (field === "description") {
        cur.description = value;
      } else if (field === "quantity") {
        const q = Math.max(1, parseInt(value, 10) || 1);
        cur.quantity = q;
        cur.amount = q * cur.unit_price;
      } else if (field === "unit_price") {
        const p = Math.max(0, parseFloat(value) || 0);
        cur.unit_price = p;
        cur.amount = cur.quantity * p;
      }
      copy[index] = cur;
      return copy;
    });
  }

  function handleAddItem() {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        quantity: 1,
        unit_price: 0,
        amount: 0,
      },
    ]);
  }

  function handleRemoveItem(index: number) {
    if (items.length <= 1) {
      toast.warning("Invoice minimal harus memiliki 1 baris item tagihan.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!invoice) return;

    // Validation
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.description.trim()) {
        toast.error(`Deskripsi item baris ke-${i + 1} tidak boleh kosong.`);
        return;
      }
      if (it.quantity < 1) {
        toast.error(`Jumlah item baris ke-${i + 1} minimal 1.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const normalizedItems = items.map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        amount: Number(it.quantity) * Number(it.unit_price),
      }));

      const res = await updateInvoiceItemsServerFn({
        data: {
          id: invoice.id,
          items: normalizedItems,
          tax_rate: Number(taxRate) || 0,
          discount: Number(discount) || 0,
          subtotal,
          total,
          notes,
        },
      });

      if (!res.success) {
        toast.error(res.message || "Gagal memperbarui rincian invoice");
        return;
      }

      toast.success(res.message || "Rincian invoice berhasil disimpan!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem saat menyimpan invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center justify-between">
            <span>Edit Rincian Item Tagihan</span>
            <span className="font-mono text-sm text-muted-foreground font-normal">
              #{invoice.invoice_number}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Hanya invoice dengan status <strong>Belum Bayar</strong> yang dapat diedit. Rincian item dan nominal total akan disesuaikan otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Items Table List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Daftar Item / Layanan
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Item
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-md border bg-card p-2.5 shadow-2xs"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <Input
                      placeholder="Nama / deskripsi item layanan"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="w-20">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        className="h-8 text-xs text-center"
                      />
                    </div>

                    <div className="w-32">
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="Harga (Rp)"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                        className="h-8 text-xs text-right"
                      />
                    </div>

                    <div className="w-28 text-right font-mono text-xs font-semibold text-foreground shrink-0 hidden sm:block">
                      {rupiah(item.amount)}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length <= 1}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax, Discount, Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Catatan Tambahan (Opsional)</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan untuk pelanggan pada invoice..."
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono font-medium">{rupiah(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">Pajak (%):</Label>
                <div className="w-24">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs text-right"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">Potongan Diskon (Rp):</Label>
                <div className="w-28">
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs text-right"
                  />
                </div>
              </div>

              <div className="border-t pt-2 flex items-center justify-between font-bold text-sm">
                <span>Total Tagihan:</span>
                <span className="font-mono text-primary text-base">{rupiah(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="gap-1.5">
            <Save className="h-4 w-4" />
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
