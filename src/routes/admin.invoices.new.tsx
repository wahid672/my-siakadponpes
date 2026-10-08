import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Trash2, ArrowLeft, Sparkles } from "lucide-react";
import { createInvoiceServerFn } from "@/lib/data-server";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfiles } from "@/lib/admin-queries";
import { rupiah } from "@/lib/auth";
import { getCachedGeneralSettings, getGeneralSettings } from "@/lib/settings";

export const Route = createFileRoute("/admin/invoices/new")({
  head: () => ({
    meta: [
      { title: "Buat Invoice Baru — SIAKAD PONPES" },
      { name: "description", content: "Form pembuatan tagihan dan invoice resmi SIAKAD PONPES." },
      { property: "og:title", content: "Buat Invoice Baru — SIAKAD PONPES" },
      { property: "og:description", content: "Form pembuatan tagihan dan invoice resmi SIAKAD PONPES." },
    ],
  }),
  component: NewInvoice,
});

const today = new Date().toISOString().slice(0, 10);
const genNumber = (prefix = "INV") => {
  const d = new Date();
  const yearMonthDay = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const randomSuffix = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix || "INV"}-${yearMonthDay}-${randomSuffix}`;
};

const SAMPLE_PRESETS = [
  { description: "Aplikasi Sistem Informasi Akademik Pondok Pesantren Terintegrasi", amount: 3500000, unit: "Lisensi", quantity: 1 },
  { description: "Paket Notifikasi WhatsApp 1 Tahun 1 Device", amount: 600000, unit: "Tahun", quantity: 1 },
  { description: "Biaya Registrasi & Setup Awal", amount: 250000, unit: "Paket", quantity: 1 },
  { description: "Modul Layanan Mobile Android Lembaga", amount: 1500000, unit: "Modul", quantity: 1 },
];

export function NewInvoice() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profiles = [] } = useProfiles();

  const { data: generalSettings } = useQuery({
    queryKey: ["general-settings"],
    queryFn: getGeneralSettings,
    initialData: getCachedGeneralSettings,
  });

  const [userId, setUserId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(() => genNumber(generalSettings?.invoicePrefix));
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [items, setItems] = useState([
    { description: "Aplikasi Sistem Informasi Akademik Pondok Pesantren Terintegrasi", quantity: 1, unit: "Paket", amount: 3500000 },
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState(() => generalSettings?.defaultNotes || "Pembayaran dapat dilakukan melalui transfer rekening atau QRIS resmi SIAKAD PONPES.");
  const [saving, setSaving] = useState(false);

  // Sinkronkan catatan default dan prefix nomor invoice dari pengaturan jika tiba dari database
  useEffect(() => {
    if (generalSettings?.defaultNotes) {
      setNotes((prev) => {
        if (!prev || prev === "Pembayaran dapat dilakukan melalui transfer rekening atau QRIS resmi SIAKAD PONPES.") {
          return generalSettings.defaultNotes;
        }
        return prev;
      });
    }
  }, [generalSettings?.defaultNotes]);

  useEffect(() => {
    if (generalSettings?.invoicePrefix && generalSettings.invoicePrefix !== "INV") {
      setInvoiceNumber((prev) => {
        if (prev.startsWith("INV-")) {
          return prev.replace(/^INV-/, `${generalSettings.invoicePrefix}-`);
        }
        return prev;
      });
    }
  }, [generalSettings?.invoicePrefix]);

  const subtotal = items.reduce((acc, it) => acc + (Number(it.amount) || 0) * (Number(it.quantity) || 1), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = Math.max(0, subtotal + taxAmount - discount);

  function addItem() {
    setItems([...items, { description: "", quantity: 1, unit: "Paket", amount: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return toast.error("Minimal harus ada 1 item");
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, key: string, value: any) {
    setItems(
      items.map((it, i) => {
        if (i !== index) return it;
        return { ...it, [key]: value };
      })
    );
  }

  function applyPreset(preset: (typeof SAMPLE_PRESETS)[0]) {
    setItems([...items, { ...preset }]);
    toast.success(`Item "${preset.description}" ditambahkan`);
  }

  async function handleSave() {
    if (!userId) return toast.error("Silakan pilih pelanggan/lembaga penerima invoice");
    if (!invoiceNumber) return toast.error("Nomor invoice wajib diisi");
    if (items.some((it) => !it.description.trim() || Number(it.amount) <= 0)) {
      return toast.error("Pastikan semua item memiliki deskripsi dan nominal yang valid");
    }

    setSaving(true);
    try {
      const res = await createInvoiceServerFn({
        data: {
          user_id: userId,
          invoice_number: invoiceNumber.trim(),
          issue_date: issueDate,
          due_date: dueDate,
          items,
          tax_rate: taxRate,
          discount,
          subtotal,
          total,
          notes: notes || null,
          status: "unpaid",
        },
      });

      setSaving(false);
      if (!res.success) {
        return void toast.error(res.message);
      }

      qc.invalidateQueries({ queryKey: ["admin-invoices"] });
      toast.success("Invoice berhasil dibuat");
      navigate({ to: "/i/$token", params: { token: res.invoiceId || invoiceNumber.trim() } });
    } catch (err: any) {
      setSaving(false);
      toast.error(err.message || "Gagal membuat invoice");
    }
  }

  const selectedProfile = profiles.find((p) => p.id === userId);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Kembali
        </Button>
      </div>

      <PageHeader
        title="Buat Invoice Baru"
        sub="Terbitkan tagihan baru untuk lembaga, pondok pesantren, dan klien mitra."
      />

      <div className="space-y-8 rounded-2xl border bg-card p-6 md:p-8 shadow-xs">
        {/* Customer & Info Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase font-bold text-muted-foreground">Pelanggan / Penerima *</Label>
              <select
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">— Pilih Pelanggan —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.organization ? `${p.organization} (${p.full_name || p.email})` : p.full_name || p.email}
                  </option>
                ))}
              </select>
            </div>

            {selectedProfile && (
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 text-muted-foreground border">
                <p className="font-semibold text-foreground">ATTN: {selectedProfile.full_name || "-"}</p>
                <p>Lembaga: {selectedProfile.organization || "Pribadi"}</p>
                <p>Alamat: {selectedProfile.address || "Belum ada alamat"}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Nomor Invoice *</Label>
              <Input
                className="mt-1.5 font-mono"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs uppercase font-bold text-muted-foreground">Tgl Terbit</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs uppercase font-bold text-muted-foreground">Jatuh Tempo</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Quick Item Presets */}
        <div className="border-t pt-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Template Item Cepat:
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="rounded-md border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
              >
                + {p.description.slice(0, 35)}...
              </button>
            ))}
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Rincian Item Invoice</h3>
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Tambah Baris
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Deskripsi layanan atau modul..."
                    value={it.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                  />
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                  />
                </div>
                <div className="w-24">
                  <Input
                    placeholder="Satuan"
                    value={it.unit}
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                  />
                </div>
                <div className="w-36">
                  <Input
                    type="number"
                    placeholder="Nominal"
                    value={it.amount}
                    onChange={(e) => updateItem(i, "amount", Number(e.target.value))}
                  />
                </div>
                <div className="w-32 text-right font-semibold text-sm">
                  {rupiah((Number(it.amount) || 0) * (Number(it.quantity) || 1))}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Calculations & Summary */}
        <div className="grid gap-6 border-t pt-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase font-bold text-muted-foreground">Catatan & Syarat Pembayaran</Label>
              <Textarea
                rows={4}
                className="mt-1.5"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan dan ketentuan pembayaran untuk invoice ini..."
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Otomatis disinkronkan dari Catatan Default di menu Pengaturan. Anda tetap dapat mengeditnya khusus untuk invoice ini.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl bg-muted/40 p-5 border text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-medium text-foreground">{rupiah(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">PPN (%):</span>
              <div className="w-24">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="h-8 text-right"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Potongan Diskon (Rp):</span>
              <div className="w-36">
                <Input
                  type="number"
                  min={0}
                  className="h-8 text-right"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between items-baseline text-base font-bold">
              <span>Total Tagihan:</span>
              <span className="text-xl text-primary font-extrabold">{rupiah(total)}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 border-t pt-6">
          <Button variant="outline" onClick={() => window.history.back()}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-36">
            {saving ? "Menerbitkan..." : "Terbitkan Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}
