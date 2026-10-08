import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  Globe,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ManualBankAccount,
  getManualBankAccounts,
  saveManualBankAccounts,
  getCachedManualTransferEnabled,
  getManualTransferEnabled,
  saveManualTransferEnabled,
  DEFAULT_MANUAL_BANKS,
} from "@/lib/manual-banks";
import {
  BankItem,
  POPULAR_INDONESIAN_BANKS,
  fetchFullBankDataset,
  autoDetectBankLogo,
  getBankIconUrl,
  normalizeBankLogoUrl,
} from "@/lib/bank-data";

export function ManualBankSettings() {
  const [banks, setBanks] = useState<ManualBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // GitHub dataset state
  const [bankDataset, setBankDataset] = useState<BankItem[]>(POPULAR_INDONESIAN_BANKS);
  const [loadingDataset, setLoadingDataset] = useState(false);

  // Dialog state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountHolder: string;
    logoUrl: string;
    instructions: string;
    isActive: boolean;
  }>({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountHolder: "",
    logoUrl: "",
    instructions: "",
    isActive: true,
  });

  // Bank suggestion search in modal
  const [bankQuery, setBankQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Global Manual Transfer Enabled Toggle
  const [isManualTransferEnabled, setIsManualTransferEnabled] = useState(() => getCachedManualTransferEnabled());
  const [savingToggle, setSavingToggle] = useState(false);

  // Load banks and toggle status on mount
  useEffect(() => {
    let mounted = true;
    getManualBankAccounts().then((data) => {
      if (mounted) {
        setBanks(data);
        setLoading(false);
      }
    });

    getManualTransferEnabled().then((en) => {
      if (mounted) setIsManualTransferEnabled(en);
    });

    const handleToggleUpdate = (e: any) => {
      if (e?.detail && typeof e.detail.isEnabled === "boolean") {
        setIsManualTransferEnabled(e.detail.isEnabled);
      }
    };
    window.addEventListener("manual_transfer_enabled_updated", handleToggleUpdate);

    // Background fetch full dataset from GitHub
    fetchFullBankDataset().then((dataset) => {
      if (mounted && dataset.length > 0) {
        setBankDataset(dataset);
      }
    });

    return () => {
      mounted = false;
      window.removeEventListener("manual_transfer_enabled_updated", handleToggleUpdate);
    };
  }, []);

  // Filtered bank suggestions
  const filteredSuggestions = useMemo(() => {
    if (!bankQuery.trim()) return bankDataset.slice(0, 15);
    const q = bankQuery.toLowerCase();
    return bankDataset
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.slug.toLowerCase().includes(q) ||
          (b.code && b.code.includes(q)) ||
          (b.aliases && b.aliases.some((a) => a.toLowerCase().includes(q)))
      )
      .slice(0, 12);
  }, [bankQuery, bankDataset]);

  function handleOpenCreate() {
    setEditingId(null);
    setBankQuery("");
    setShowSuggestions(false);
    setFormData({
      bankName: "",
      bankCode: "",
      accountNumber: "",
      accountHolder: "",
      logoUrl: "",
      instructions: "Tambahkan berita transfer dengan Nomor Invoice Anda.",
      isActive: true,
    });
    setModalOpen(true);
  }

  function handleOpenEdit(b: ManualBankAccount) {
    setEditingId(b.id);
    setBankQuery(b.bankName);
    setShowSuggestions(false);
    setFormData({
      bankName: b.bankName,
      bankCode: b.bankCode || "",
      accountNumber: b.accountNumber,
      accountHolder: b.accountHolder,
      logoUrl: normalizeBankLogoUrl(b.logoUrl, b.bankCode),
      instructions: b.instructions || "",
      isActive: b.isActive,
    });
    setModalOpen(true);
  }

  function handleSelectBank(bank: BankItem) {
    const norm = normalizeBankLogoUrl(bank.logoUrl, bank.slug);
    setFormData((prev) => ({
      ...prev,
      bankName: bank.name,
      bankCode: bank.slug,
      logoUrl: norm,
    }));
    setBankQuery(bank.name);
    setShowSuggestions(false);
  }

  function handleBankQueryChange(val: string) {
    setBankQuery(val);
    setShowSuggestions(true);
    setFormData((prev) => {
      const detected = autoDetectBankLogo(val, bankDataset);
      return {
        ...prev,
        bankName: val,
        bankCode: detected?.slug || prev.bankCode,
        logoUrl: detected ? normalizeBankLogoUrl(detected.logoUrl, detected.slug) : prev.logoUrl,
      };
    });
  }

  async function handleToggleManualTransfer(checked: boolean) {
    setIsManualTransferEnabled(checked);
    setSavingToggle(true);
    try {
      const res = await saveManualTransferEnabled(checked);
      if (res.success) {
        toast.success(`Transfer bank manual berhasil ${checked ? "diaktifkan (ON)" : "dinonaktifkan (OFF)"}`);
      } else {
        toast.error("Gagal menyimpan perubahan status transfer manual.");
      }
    } catch (err: any) {
      toast.error("Terjadi kesalahan: " + (err?.message || ""));
    } finally {
      setSavingToggle(false);
    }
  }

  async function handleToggleActive(id: string) {
    const updated = banks.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b));
    setBanks(updated);
    const target = updated.find((b) => b.id === id);
    toast.info(`Rekening ${target?.bankName} ${target?.isActive ? "diaktifkan" : "dinonaktifkan"}`);
    await saveManualBankAccounts(updated);
  }

  async function handleDelete(id: string) {
    const target = banks.find((b) => b.id === id);
    if (!window.confirm(`Hapus rekening bank ${target?.bankName} (${target?.accountNumber})?`)) {
      return;
    }
    const updated = banks.filter((b) => b.id !== id);
    setBanks(updated);
    toast.success("Rekening bank berhasil dihapus.");
    await saveManualBankAccounts(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.bankName.trim()) {
      return toast.error("Nama bank harus diisi.");
    }
    if (!formData.accountNumber.trim()) {
      return toast.error("Nomor rekening harus diisi.");
    }
    if (!formData.accountHolder.trim()) {
      return toast.error("Atas nama pemilik rekening harus diisi.");
    }

    setSaving(true);
    try {
      let updated: ManualBankAccount[];
      const effectiveLogo =
        formData.logoUrl.trim() ||
        (formData.bankCode ? getBankIconUrl(formData.bankCode) : "");

      if (editingId) {
        updated = banks.map((b) =>
          b.id === editingId
            ? {
                ...b,
                bankName: formData.bankName.trim(),
                bankCode: formData.bankCode.trim(),
                accountNumber: formData.accountNumber.trim(),
                accountHolder: formData.accountHolder.trim(),
                logoUrl: effectiveLogo,
                instructions: formData.instructions.trim(),
                isActive: formData.isActive,
              }
            : b
        );
      } else {
        const newBank: ManualBankAccount = {
          id: `bank_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          bankName: formData.bankName.trim(),
          bankCode: formData.bankCode.trim(),
          accountNumber: formData.accountNumber.trim(),
          accountHolder: formData.accountHolder.trim(),
          logoUrl: effectiveLogo,
          instructions: formData.instructions.trim(),
          isActive: formData.isActive,
          order: banks.length + 1,
        };
        updated = [...banks, newBank];
      }

      setBanks(updated);
      const res = await saveManualBankAccounts(updated);
      if (res.persistedToDb) {
        toast.success("Rekening bank berhasil disimpan ke database!");
      } else {
        toast.success("Rekening bank disimpan di penyimpanan lokal.");
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error("Gagal menyimpan rekening: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRefreshDataset() {
    setLoadingDataset(true);
    try {
      const dataset = await fetchFullBankDataset();
      setBankDataset(dataset);
      toast.success(`Berhasil memuat ${dataset.length} logo bank dari repositori GitHub idn-finlogos!`);
    } catch {
      toast.error("Gagal menyinkronkan dataset bank dari GitHub.");
    } finally {
      setLoadingDataset(false);
    }
  }

  function handleCopyNumber(num: string, id: string) {
    navigator.clipboard.writeText(num);
    setCopiedId(id);
    toast.success("Nomor rekening berhasil disalin!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-bold text-base text-foreground">Rekening Transfer Bank Manual</h3>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isManualTransferEnabled
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                {isManualTransferEnabled ? "Aktif (ON)" : "Nonaktif (OFF)"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Klien dan lembaga mitra dapat memilih rekening resmi ini dan melakukan transfer langsung tanpa biaya gateway.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
          {/* Switch ON/OFF Toggle */}
          <div className="flex items-center gap-2.5 rounded-xl border bg-muted/40 px-3.5 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-foreground">
              {isManualTransferEnabled ? "Aktif (ON)" : "Nonaktif (OFF)"}
            </span>
            <Switch
              checked={isManualTransferEnabled}
              onCheckedChange={handleToggleManualTransfer}
              disabled={savingToggle}
              title="Aktifkan atau nonaktifkan saluran transfer manual"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshDataset}
            disabled={loadingDataset}
            title="Muat ulang koleksi logo bank terbaru dari GitHub"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loadingDataset ? "animate-spin" : ""}`} />
            {loadingDataset ? "Sinkronisasi..." : "Sinkron Dataset GitHub"}
          </Button>

          <Button onClick={handleOpenCreate} size="sm" className="bg-primary text-primary-foreground font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Tambah Rekening Bank
          </Button>
        </div>
      </div>

      {/* Warning Callout when Manual Transfer is Disabled */}
      {!isManualTransferEnabled && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Transfer Bank Manual Saat Ini Dinonaktifkan (OFF)
            </p>
            <p className="mt-0.5 text-[11px]">
              Tab &ldquo;Transfer Manual&rdquo; disembunyikan dari dialog invoice klien. Klien tidak akan dapat memilih rekening bank manual hingga opsi ini diaktifkan kembali.
            </p>
          </div>
        </div>
      )}

      {/* Dataset Info Callout */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-3">
        <Globe className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="space-y-0.5">
          <p className="font-semibold">Dataset Logo Otomatis Terhubung ke GitHub (hafidznoor/idn-finlogos)</p>
          <p className="text-[11px] text-blue-600/80 dark:text-blue-300/80">
            Cukup pilih atau ketik nama bank (contoh: <em>BSI, BCA, BRI, Mandiri, BNI, BTN, Bank Jateng, Jatim, Muamalat</em>), 
            sistem akan secara otomatis menyematkan logo resmi SVG beresolusi tinggi langsung dari GitHub CDN.
          </p>
        </div>
      </div>

      {/* Bank Accounts Grid */}
      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary mb-2" />
          Memuat daftar rekening bank...
        </div>
      ) : banks.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
          <h4 className="font-semibold text-base">Belum Ada Rekening Bank Manual</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Tambahkan rekening bank resmi agar lembaga klien dapat mentransfer langsung ke rekening Anda.
          </p>
          <Button onClick={handleOpenCreate} size="sm" className="mt-4">
            <Plus className="mr-2 h-4 w-4" /> Tambah Rekening Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {banks.map((bank) => {
            const logo = normalizeBankLogoUrl(bank.logoUrl, bank.bankCode);
            return (
              <div
                key={bank.id}
                className={`relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs transition hover:border-primary/50 ${
                  !bank.isActive ? "opacity-60 bg-muted/20" : ""
                }`}
              >
                <div>
                  {/* Card Header: Logo & Status Switch */}
                  <div className="flex items-start justify-between gap-3 border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-20 items-center justify-center rounded-xl border bg-white p-2 shadow-inner">
                        {logo ? (
                          <img
                            src={logo}
                            alt={bank.bankName}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              // Fallback on broken image
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{bank.bankName}</h4>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          {bank.bankCode ? `Kode: ${bank.bankCode}` : "Transfer Bank"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                        {bank.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                      <Switch
                        checked={bank.isActive}
                        onCheckedChange={() => handleToggleActive(bank.id)}
                      />
                    </div>
                  </div>

                  {/* Account Number & Holder */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                          Nomor Rekening
                        </span>
                        <p className="font-mono text-lg font-bold tracking-wider text-foreground">
                          {bank.accountNumber}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyNumber(bank.accountNumber, bank.id)}
                        className="h-8 gap-1 text-xs"
                      >
                        {copiedId === bank.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{copiedId === bank.id ? "Tersalin" : "Salin"}</span>
                      </Button>
                    </div>

                    <div className="text-xs">
                      <span className="text-muted-foreground">Atas Nama: </span>
                      <span className="font-semibold text-foreground">{bank.accountHolder}</span>
                    </div>

                    {bank.instructions && (
                      <div className="rounded-lg bg-muted/20 p-2.5 text-[11px] text-muted-foreground border">
                        <span className="font-medium text-foreground">Instruksi: </span>
                        {bank.instructions}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 border-t pt-3 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(bank)}
                    className="h-8 text-xs"
                  >
                    <Pencil className="mr-1.5 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(bank.id)}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                  >
                    <Trash2 className="mr-1.5 h-3 w-3" /> Hapus
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Bank Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Rekening Bank Manual" : "Tambah Rekening Bank Manual"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Bank Name Search with live suggestions */}
            <div className="space-y-2 relative">
              <Label>Nama Bank</Label>
              <div className="relative">
                <Input
                  value={bankQuery}
                  onChange={(e) => handleBankQueryChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Ketik nama bank (contoh: BSI, BRI, BCA, Mandiri)..."
                  className="pr-9"
                  required
                />
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-lg">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Saran Logo Bank dari GitHub
                  </p>
                  <div className="space-y-1">
                    {filteredSuggestions.map((item) => (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => handleSelectBank(item)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition hover:bg-muted"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-6 w-9 items-center justify-center rounded bg-white p-0.5 border">
                            <img
                              src={normalizeBankLogoUrl(item.logoUrl, item.slug)}
                              alt={item.name}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                          <span className="font-medium text-foreground">{item.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground uppercase">
                          {item.slug}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live Logo Preview Box */}
            <div className="rounded-xl border bg-muted/20 p-3 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-foreground">Preview Logo Bank</span>
                <p className="text-[10px] text-muted-foreground">
                  {formData.bankCode ? `Terhubung ke icon slug: ${formData.bankCode}` : "Otomatis dari dataset"}
                </p>
              </div>

              <div className="flex h-10 w-20 items-center justify-center rounded-lg border bg-white p-1.5 shadow-xs">
                {formData.logoUrl ? (
                  <img
                    src={normalizeBankLogoUrl(formData.logoUrl, formData.bankCode)}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Building2 className="h-5 w-5 text-slate-300" />
                )}
              </div>
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label>Nomor Rekening</Label>
              <Input
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="Contoh: 7188899901"
                className="font-mono font-semibold"
                required
              />
            </div>

            {/* Account Holder */}
            <div className="space-y-2">
              <Label>Atas Nama (Pemilik Rekening)</Label>
              <Input
                value={formData.accountHolder}
                onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                placeholder="Contoh: Yayasan Pondok Pesantren / Bendahara"
                required
              />
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label>Catatan / Instruksi Transfer (Opsional)</Label>
              <Textarea
                rows={2}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Contoh: Tambahkan berita transfer dengan Nomor Invoice Anda."
              />
            </div>

            {/* Custom Logo URL Accordion/Field (Optional) */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-muted-foreground">URL Logo Khusus (Opsional / Override)</Label>
              <Input
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://... (Biarkan terisi otomatis dari GitHub)"
                className="text-xs"
              />
            </div>

            {/* Status Switch */}
            <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3 pt-2">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Status Rekening Aktif</Label>
                <p className="text-[11px] text-muted-foreground">
                  Tampilkan rekening ini sebagai opsi bayar pada lembar invoice.
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambahkan Rekening"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
