import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Building,
  FileText,
  MapPin,
  EyeOff,
  Building2,
  ChevronRight,
  Mail,
  Send,
  Lock,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Database,
} from "lucide-react";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";
import { BackupRestoreCard } from "@/components/BackupRestoreCard";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getGeneralSettings,
  saveGeneralSettings,
  GeneralSettings,
  DEFAULT_GENERAL_SETTINGS,
  SmtpConfig,
  DEFAULT_SMTP_CONFIG,
} from "@/lib/settings";
import {
  getSmtpSettingsServerFn,
  saveSmtpSettingsServerFn,
  testSmtpSettingsServerFn,
} from "@/lib/settings-server";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan Sistem — SIAKAD PONPES" },
      { name: "description", content: "Konfigurasi format invoice, profil lembaga, dan server SMTP email OTP." },
      { property: "og:title", content: "Pengaturan Sistem — SIAKAD PONPES" },
      { property: "og:description", content: "Konfigurasi format invoice, profil lembaga, dan server SMTP email OTP." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(DEFAULT_SMTP_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testTargetEmail, setTestTargetEmail] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([getGeneralSettings(), getSmtpSettingsServerFn()])
      .then(([cfg, smtp]) => {
        if (mounted) {
          setSettings(cfg);
          if (smtp) {
            setSmtpConfig(smtp);
            setTestTargetEmail(smtp.user || smtp.fromEmail || "");
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saveGeneralSettings(settings);
      toast.success(res.message || "Pengaturan lembaga berhasil disimpan!");
    } catch (err: any) {
      toast.error("Gagal menyimpan pengaturan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSmtp(e: React.FormEvent) {
    e.preventDefault();
    setSavingSmtp(true);
    try {
      const res = await saveSmtpSettingsServerFn({ data: smtpConfig });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error("Gagal menyimpan SMTP: " + err.message);
    } finally {
      setSavingSmtp(false);
    }
  }

  async function handleTestSmtp() {
    if (!smtpConfig.user || !smtpConfig.pass) {
      return toast.error("Masukkan Username & Password SMTP terlebih dahulu");
    }
    const target = testTargetEmail.trim() || smtpConfig.user.trim();
    if (!target) {
      return toast.error("Masukkan alamat email tujuan tes");
    }

    setTestingSmtp(true);
    try {
      const res = await testSmtpSettingsServerFn({
        data: { config: smtpConfig, targetEmail: target },
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error("Gagal tes koneksi SMTP: " + err.message);
    } finally {
      setTestingSmtp(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Pengaturan Sistem"
        sub="Kelola identitas penerbit invoice, format penomoran, dan server email SMTP untuk pengiriman OTP."
      />

      <Tabs defaultValue="institution" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="institution" className="flex items-center gap-1.5 text-xs">
            <Building className="h-4 w-4 shrink-0" /> Profil Lembaga
          </TabsTrigger>
          <TabsTrigger value="smtp" className="flex items-center gap-1.5 text-xs">
            <Mail className="h-4 w-4 shrink-0" /> SMTP Email OTP
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs">
            <KeyRound className="h-4 w-4 shrink-0" /> Ganti Password
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-1.5 text-xs">
            <Database className="h-4 w-4 shrink-0" /> Backup & Restore
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profil Lembaga */}
        <TabsContent value="institution" className="space-y-6">
          <form onSubmit={handleSaveGeneral} className="space-y-6 rounded-2xl border bg-card p-6 md:p-8 shadow-xs">
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" /> Identitas Penerbit Tagihan
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nama Brand / Institusi</Label>
                  <Input
                    value={settings.institutionName}
                    onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sub Judul / Tagline</Label>
                  <Input
                    value={settings.subtitle}
                    onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Resmi Admin</Label>
                  <Input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nomor WhatsApp Bantuan</Label>
                  <Input
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="sm:col-span-2 space-y-3 rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-semibold">Alamat Kantor Pengelola</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tampilkan alamat kantor di header dokumen invoice (baik cetak PDF maupun link publik).
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                        {settings.showAddressInInvoice ? "Tampil di Invoice" : "Disembunyikan"}
                      </span>
                      <Switch
                        checked={settings.showAddressInInvoice}
                        onCheckedChange={(checked) => setSettings({ ...settings, showAddressInInvoice: checked })}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Textarea
                      rows={2}
                      value={settings.address}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                      placeholder="Contoh: Kantor Pengelola Sistem SIAKAD PONPES / Jl. Raya Pesantren No. 10"
                      disabled={loading}
                      className={settings.showAddressInInvoice ? "" : "opacity-70 bg-muted/40"}
                    />
                    {!settings.showAddressInInvoice && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5">
                        <EyeOff className="h-3 w-3" /> Alamat kantor tidak akan ditampilkan pada lembar invoice publik maupun cetak.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Standarisasi Template Invoice
              </h2>

              <div className="space-y-4">
                <div className="space-y-2 max-w-xs">
                  <Label>Prefix Nomor Invoice</Label>
                  <Input
                    value={settings.invoicePrefix}
                    onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                    disabled={loading}
                  />
                  <p className="text-[11px] text-muted-foreground">Contoh format hasil: {settings.invoicePrefix}-20261007-001</p>
                </div>

                <div className="space-y-2">
                  <Label>Catatan & Syarat Pembayaran Default (Notes)</Label>
                  <Textarea
                    rows={3}
                    value={settings.defaultNotes}
                    onChange={(e) => setSettings({ ...settings, defaultNotes: e.target.value })}
                    disabled={loading}
                    placeholder="Contoh: Pembayaran dapat dilakukan melalui transfer rekening atau QRIS resmi SIAKAD PONPES."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Teks ini otomatis digunakan sebagai catatan default saat membuat invoice baru dan ditampilkan pada lembar invoice publik serta cetak PDF.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t pt-5">
              <Button type="submit" disabled={saving || loading}>
                {saving ? "Menyimpan..." : "Simpan Pengaturan Lembaga"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Tab 2: Konfigurasi SMTP */}
        <TabsContent value="smtp" className="space-y-6">
          <form onSubmit={handleSaveSmtp} className="space-y-6 rounded-2xl border bg-card p-6 md:p-8 shadow-xs">
            <div className="flex items-center justify-between border-b pb-5">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" /> Konfigurasi Server SMTP
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Digunakan untuk mengirimkan 6 digit kode OTP verifikasi akun ke email pengguna dan admin.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {smtpConfig.isEnabled ? "Status: AKTIF" : "Status: NONAKTIF"}
                </span>
                <Switch
                  checked={smtpConfig.isEnabled}
                  onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, isEnabled: checked })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>SMTP Host</Label>
                <Input
                  value={smtpConfig.host}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground">Untuk Gmail gunakan <code>smtp.gmail.com</code></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) || 465 })}
                    placeholder="465"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Enkripsi SSL/TLS</Label>
                  <div className="flex items-center h-10 gap-2 pt-1">
                    <Switch
                      checked={smtpConfig.secure}
                      onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, secure: checked })}
                      disabled={loading}
                    />
                    <span className="text-xs font-medium">{smtpConfig.secure ? "SSL (465)" : "TLS/STARTTLS (587)"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Username / Email Akun Pengirim</Label>
                <Input
                  value={smtpConfig.user}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                  placeholder="pesantren@gmail.com"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Password / App Password</Label>
                <Input
                  type="password"
                  value={smtpConfig.pass}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                  placeholder="••••••••••••••••"
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground">Untuk Gmail, gunakan 16 karakter App Password dari Akun Google Anda.</p>
              </div>

              <div className="space-y-2">
                <Label>Nama Pengirim (Display Name)</Label>
                <Input
                  value={smtpConfig.fromName}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                  placeholder="SIAKAD PONPES"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Alamat Email Pengirim (From)</Label>
                <Input
                  value={smtpConfig.fromEmail}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                  placeholder="pesantren@gmail.com"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Panduan Gmail App Password */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20 p-4 space-y-2">
              <h4 className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Petunjuk Setup Gmail SMTP:
              </h4>
              <ol className="text-xs text-sky-700 dark:text-sky-400 list-decimal list-inside space-y-1 leading-relaxed">
                <li>Buka Akun Google Anda &gt; menu <b>Keamanan (Security)</b>.</li>
                <li>Pastikan <b>Verifikasi 2 Langkah (2-Step Verification)</b> sudah aktif.</li>
                <li>Cari menu <b>Sandi Aplikasi (App Passwords)</b>.</li>
                <li>Buat nama aplikasi (misal: <i>SIAKAD PONPES</i>), lalu salin 16 digit sandi yang dihasilkan ke kolom Password di atas.</li>
              </ol>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-5">
              <div className="flex items-center gap-2 max-w-sm w-full">
                <Input
                  type="email"
                  value={testTargetEmail}
                  onChange={(e) => setTestTargetEmail(e.target.value)}
                  placeholder="Email tujuan tes (misal: nama@gmail.com)"
                  className="h-9 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp || loading}
                  className="shrink-0"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {testingSmtp ? "Menguji..." : "Tes Koneksi"}
                </Button>
              </div>

              <Button type="submit" disabled={savingSmtp || loading}>
                {savingSmtp ? "Menyimpan..." : "Simpan Konfigurasi SMTP"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* Tab 3: Keamanan & Ganti Password */}
        <TabsContent value="security" className="space-y-6">
          <ChangePasswordCard />
        </TabsContent>

        {/* Tab 4: Backup & Restore Basis Data */}
        <TabsContent value="backup" className="space-y-6">
          <BackupRestoreCard />
        </TabsContent>
      </Tabs>

      {/* Rekening Pembayaran Manual Section Link */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Rekening Transfer Bank Manual</h3>
            <p className="text-xs text-muted-foreground">
              Tambah & atur rekening bank resmi dengan logo bank otomatis terhubung ke sistem.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/payment-channels">
            Atur Rekening Bank <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
