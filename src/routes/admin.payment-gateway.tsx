import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ShieldAlert,
  Copy,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Database,
  Globe,
  Radio,
  FileCode2,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getTripayBaseUrl } from "@/lib/tripay";
import { getTripaySettings, saveTripaySettings, TripaySettings, DEFAULT_TRIPAY_CONFIG } from "@/lib/settings";

export const Route = createFileRoute("/admin/payment-gateway")({
  head: () => ({
    meta: [
      { title: "Pengaturan Payment Gateway — SIAKAD PONPES" },
      { name: "description", content: "Konfigurasi kredensial Tripay Payment Gateway Sandbox dan Production." },
      { property: "og:title", content: "Pengaturan Payment Gateway — SIAKAD PONPES" },
      { property: "og:description", content: "Konfigurasi kredensial Tripay Payment Gateway Sandbox dan Production." },
    ],
  }),
  component: PaymentGatewaySettings,
});

export function PaymentGatewaySettings() {
  const [gatewayConfig, setGatewayConfig] = useState<TripaySettings>({
    isEnabled: DEFAULT_TRIPAY_CONFIG.isEnabled,
    mode: DEFAULT_TRIPAY_CONFIG.mode,
    merchantCode: DEFAULT_TRIPAY_CONFIG.merchantCode,
    apiKey: DEFAULT_TRIPAY_CONFIG.apiKey,
    privateKey: DEFAULT_TRIPAY_CONFIG.privateKey,
  });

  const [configSource, setConfigSource] = useState<"database" | "cache" | "default">("default");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/payment/tripay/callback`
      : `${process.env.APP_URL || "http://localhost:3000"}/api/payment/tripay/callback`;

  useEffect(() => {
    let mounted = true;
    getTripaySettings().then((cfg) => {
      if (mounted) {
        setGatewayConfig({
          mode: cfg.mode,
          merchantCode: cfg.merchantCode,
          apiKey: cfg.apiKey,
          privateKey: cfg.privateKey,
          isEnabled: cfg.isEnabled,
        });
        setConfigSource(cfg.source);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  function copyCallback() {
    navigator.clipboard.writeText(callbackUrl);
    toast.success("Webhook URL Tripay berhasil disalin ke clipboard");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saveTripaySettings(gatewayConfig);
      if (res.persistedToDb) {
        setConfigSource("database");
        toast.success("Pengaturan Tripay berhasil disimpan ke Database SQLite!");
      } else {
        setConfigSource("cache");
        toast.success("Pengaturan Tripay berhasil disimpan di cache sistem!");
      }
    } catch (err: any) {
      toast.error("Gagal menyimpan pengaturan: " + (err?.message || "Terjadi kesalahan"));
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);

    try {
      // 1. Try TanStack Start server function (runs on server, no CORS)
      const { testTripayConnectionServerFn } = await import("@/lib/tripay-server");
      const res = await testTripayConnectionServerFn({
        data: {
          mode: gatewayConfig.mode,
          apiKey: gatewayConfig.apiKey.trim(),
        },
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: res.message,
        });
        toast.success("Koneksi ke Tripay Berhasil!");
        return;
      } else {
        setTestResult({
          success: false,
          message: `${res.message}. Harap pastikan API Key valid dan terdaftar di dashboard Tripay.`,
        });
        toast.error(`Respon Tripay: ${res.message}`);
        return;
      }
    } catch (err: any) {
      // 2. Fallback to /api/tripay/test-connection endpoint
      try {
        const proxyRes = await fetch("/api/tripay/test-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: gatewayConfig.mode,
            apiKey: gatewayConfig.apiKey.trim(),
          }),
        });
        const proxyData = await proxyRes.json().catch(() => null);
        if (proxyRes.ok && proxyData?.success) {
          setTestResult({
            success: true,
            message: `Berhasil terhubung ke Tripay ${gatewayConfig.mode.toUpperCase()}! Ditemukan ${proxyData.data?.length ?? 0} saluran pembayaran aktif.`,
          });
          toast.success("Koneksi ke Tripay Berhasil!");
          return;
        } else {
          const msg = proxyData?.message || `HTTP ${proxyRes.status}`;
          setTestResult({
            success: false,
            message: `${msg}. Harap pastikan API Key valid dan terdaftar di dashboard Tripay.`,
          });
          toast.error(`Respon Tripay: ${msg}`);
          return;
        }
      } catch (proxyErr: any) {
        setTestResult({
          success: false,
          message: err?.message || proxyErr?.message || "Gagal menghubungi server Tripay.",
        });
        toast.error("Gagal melakukan request ke Tripay");
      }
    } finally {
      setTesting(false);
    }
  }

  async function testWebhookEndpoint() {
    setTestingWebhook(true);
    try {
      const res = await fetch("/api/payment/tripay/callback");
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast.success("Endpoint Webhook Tripay Aktif: " + (data?.message || "Status 200 OK"));
      } else {
        toast.error(`Endpoint Webhook merespon HTTP ${res.status}`);
      }
    } catch (err: any) {
      toast.error("Gagal menghubungi endpoint webhook: " + err.message);
    } finally {
      setTestingWebhook(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Pengaturan Payment Gateway"
        sub="Integrasi otomatisasi pembayaran tagihan pesantren menggunakan Tripay."
      />

      {/* Storage Source Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/60 p-4 text-xs">
        <div className="flex items-center gap-3">
          <Database className={`h-4 w-4 shrink-0 ${configSource === "database" ? "text-emerald-500" : "text-amber-500"}`} />
          <div>
            <p className="font-semibold text-foreground">
              Penyimpanan:{" "}
              {configSource === "database" ? (
                <span className="text-emerald-600 font-bold">Database PostgreSQL (Tabel settings)</span>
              ) : configSource === "cache" ? (
                <span className="text-blue-600 font-bold">Cache Sistem & LocalStorage</span>
              ) : (
                <span className="text-amber-600 font-bold">Konfigurasi Default Sandbox</span>
              )}
            </p>
            <p className="text-muted-foreground mt-0.5">
              Perubahan form akan otomatis disimpan dan digunakan di seluruh transaksi aplikasi.
            </p>
          </div>
        </div>

      </div>

      {/* Warning/Alert Banner */}
      <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
        <p>
          Pastikan Anda mendaftarkan <strong>URL Callback</strong> di dashboard Tripay agar verifikasi pembayaran QRIS dan Virtual Account berjalan otomatis.
        </p>
      </div>

      {testResult && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-start gap-3 ${
            testResult.success
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{testResult.success ? "Hasil Tes Koneksi: Sukses" : "Hasil Tes Koneksi: Gagal"}</p>
            <p className="mt-1">{testResult.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 rounded-2xl border bg-card p-6 md:p-8 shadow-xs">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between border-b pb-5">
          <div>
            <p className="font-semibold text-sm">Status Payment Gateway</p>
            <p className="text-xs text-muted-foreground">Aktifkan pembayaran otomatis melalui Tripay</p>
          </div>
          <Switch
            checked={gatewayConfig.isEnabled}
            onCheckedChange={(checked) => setGatewayConfig({ ...gatewayConfig, isEnabled: checked })}
          />
        </div>

        {/* Environment Mode */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Lingkungan (Environment Mode)</Label>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <button
              type="button"
              onClick={() => setGatewayConfig({ ...gatewayConfig, mode: "sandbox" })}
              className={`rounded-lg border p-3 text-left transition ${
                gatewayConfig.mode === "sandbox"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "bg-background text-muted-foreground"
              }`}
            >
              <p className="text-sm">Sandbox (Uji Coba)</p>
              <p className="text-[11px] opacity-80">https://tripay.co.id/api-sandbox</p>
            </button>
            <button
              type="button"
              onClick={() => setGatewayConfig({ ...gatewayConfig, mode: "production" })}
              className={`rounded-lg border p-3 text-left transition ${
                gatewayConfig.mode === "production"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "bg-background text-muted-foreground"
              }`}
            >
              <p className="text-sm">Production (Live)</p>
              <p className="text-[11px] opacity-80">https://tripay.co.id/api</p>
            </button>
          </div>
        </div>

        {/* Credentials */}
        <div className="space-y-4 border-t pt-5">
          <div className="space-y-2">
            <Label>Kode Merchant</Label>
            <Input
              value={gatewayConfig.merchantCode}
              onChange={(e) => setGatewayConfig({ ...gatewayConfig, merchantCode: e.target.value })}
              placeholder="Contoh: T10469"
            />
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="text"
              value={gatewayConfig.apiKey}
              onChange={(e) => setGatewayConfig({ ...gatewayConfig, apiKey: e.target.value })}
              placeholder="Contoh: DEV-xxxx"
            />
          </div>

          <div className="space-y-2">
            <Label>Private Key</Label>
            <Input
              type="password"
              value={gatewayConfig.privateKey}
              onChange={(e) => setGatewayConfig({ ...gatewayConfig, privateKey: e.target.value })}
              placeholder="Masukkan Private Key"
            />
          </div>
        </div>

        {/* Webhook Callback */}
        <div className="space-y-2 border-t pt-5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase text-muted-foreground">URL Callback / Webhook</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={testWebhookEndpoint}
              disabled={testingWebhook}
              className="text-xs h-7 text-primary hover:text-primary gap-1"
            >
              <Radio className={`h-3 w-3 ${testingWebhook ? "animate-pulse text-amber-500" : ""}`} />
              {testingWebhook ? "Menguji..." : "Tes Endpoint Webhook"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input readOnly value={callbackUrl} className="font-mono text-xs bg-muted/40" />
            <Button type="button" variant="outline" size="icon" onClick={copyCallback}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Salin tautan ini dan masukkan ke pengaturan Callback URL di merchant console Tripay.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <Button type="button" variant="outline" onClick={testConnection} disabled={testing || loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${testing ? "animate-spin" : ""}`} />
            {testing ? "Menguji Koneksi..." : "Tes Koneksi API Langsung"}
          </Button>

          <Button type="submit" disabled={saving || loading}>
            {saving ? "Menyimpan..." : "Simpan Konfigurasi ke Database"}
          </Button>
        </div>
      </form>
    </div>
  );
}
