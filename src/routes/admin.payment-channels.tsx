import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Layers, CheckCircle2, XCircle, ShieldCheck, Zap, Building2, AlertTriangle, ArrowRight, RefreshCw, Check } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DEFAULT_TRIPAY_CHANNELS, fetchTripayChannels, getCachedTripayChannels } from "@/lib/tripay";
import { PaymentChannelItem } from "@/lib/domain-types";
import { rupiah } from "@/lib/auth";
import { ManualBankSettings } from "@/components/ManualBankSettings";
import { getTripaySettings, getCachedTripaySettings } from "@/lib/settings";

export const Route = createFileRoute("/admin/payment-channels")({
  head: () => ({
    meta: [
      { title: "Saluran Pembayaran — SIAKAD PONPES" },
      { name: "description", content: "Kelola saluran pembayaran aktif seperti Rekening Bank Manual, QRIS, Virtual Account, dan E-Wallet." },
      { property: "og:title", content: "Saluran Pembayaran — SIAKAD PONPES" },
      { property: "og:description", content: "Kelola saluran pembayaran aktif seperti Rekening Bank Manual, QRIS, Virtual Account, dan E-Wallet." },
    ],
  }),
  component: PaymentChannels,
});

function PaymentChannels() {
  const [channels, setChannels] = useState<PaymentChannelItem[]>(() => getCachedTripayChannels());
  const [tripayConfig, setTripayConfig] = useState(() => getCachedTripaySettings());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let mounted = true;
    getTripaySettings().then((cfg) => {
      if (mounted) setTripayConfig(cfg);
    });

    fetchTripayChannels(false).then((res) => {
      if (mounted && res?.channels && res.channels.length > 0) {
        setChannels(res.channels);
      }
    });

    const handleUpdate = (e: any) => {
      if (e?.detail) setTripayConfig(e.detail);
    };
    const handleChannelsUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setChannels(e.detail);
      }
    };

    window.addEventListener("tripay_settings_updated", handleUpdate);
    window.addEventListener("tripay_channels_updated", handleChannelsUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("tripay_settings_updated", handleUpdate);
      window.removeEventListener("tripay_channels_updated", handleChannelsUpdate);
    };
  }, []);

  async function handleSyncTripay() {
    setIsSyncing(true);
    try {
      const res = await fetchTripayChannels(true);
      if (res?.channels) {
        setChannels(res.channels);
        const activeCount = res.channels.filter((c) => c.active !== false).length;
        toast.success(res.message || `Berhasil menyinkronkan ${activeCount} saluran pembayaran dari Tripay!`);
      } else {
        toast.error("Gagal menyinkronkan saluran pembayaran dari Tripay");
      }
    } catch (err: any) {
      toast.error("Gagal menghubungi Tripay: " + (err?.message || "Terjadi kesalahan"));
    } finally {
      setIsSyncing(false);
    }
  }

  const groups = Array.from(new Set(channels.map((c) => c.group)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saluran Pembayaran"
        sub="Kelola rekening transfer bank manual pesantren serta saluran otomatis Tripay Payment Gateway."
      />

      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Transfer Bank Manual
          </TabsTrigger>
          <TabsTrigger value="tripay" className="flex items-center gap-2">
            <Zap className="h-4 w-4" /> Otomatis (Tripay)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Manual Bank Transfer */}
        <TabsContent value="manual" className="space-y-6">
          <ManualBankSettings />
        </TabsContent>

        {/* Tab 2: Tripay Gateway */}
        <TabsContent value="tripay" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div
              className={`rounded-xl border p-4 text-xs flex items-center gap-3 flex-1 ${
                tripayConfig.isEnabled
                  ? "bg-card text-muted-foreground"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
              }`}
            >
              {tripayConfig.isEnabled ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                  <p>
                    Saluran pembayaran otomatis menggunakan integrasi <strong>Tripay Payment Gateway</strong> (Mode {tripayConfig.mode.toUpperCase()} aktif).
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      Payment Gateway Tripay Saat Ini Dinonaktifkan (OFF)
                    </p>
                    <p className="mt-0.5 text-[11px]">
                      Tab dan saluran otomatis Tripay disembunyikan dari dialog invoice klien.
                    </p>
                  </div>
                  <Link
                    to="/admin/payment-gateway"
                    className="inline-flex items-center gap-1 font-bold text-amber-700 underline dark:text-amber-300 text-xs shrink-0"
                  >
                    Buka Pengaturan <ArrowRight className="h-3 w-3" />
                  </Link>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncTripay}
              disabled={isSyncing}
              className="shrink-0 font-medium"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Menyinkronkan..." : "Sinkronisasi Tripay"}
            </Button>
          </div>

          {/* Informative Banner */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-0.5">
              <p className="font-semibold">Sinkronisasi Otomatis dari Dashboard Tripay</p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                Saluran pembayaran di bawah ini disinkronkan langsung dari akun Tripay Anda. Setiap saluran yang Anda aktifkan di dashboard merchant Tripay akan otomatis tersedia untuk klien tanpa perlu pengaturan manual lagi di sini.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {groups.map((group) => {
              const groupItems = channels.filter((c) => c.group === group);
              return (
                <div key={group} className="space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{group}</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {groupItems.map((c) => (
                      <div
                        key={c.code}
                        className={`flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition hover:border-primary/40 ${
                          !c.active ? "opacity-60 bg-muted/20" : ""
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {c.icon_url ? (
                                <div className="flex h-9 w-12 items-center justify-center rounded-lg border bg-white p-1 shrink-0 shadow-2xs">
                                  <img
                                    src={c.icon_url}
                                    alt={c.name}
                                    className="max-h-full max-w-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                                  <Zap className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <span className="font-semibold text-xs sm:text-sm text-foreground line-clamp-1">{c.name}</span>
                                <p className="font-mono text-[11px] text-muted-foreground uppercase">{c.code}</p>
                              </div>
                            </div>

                            {/* Badge Status Aktif di Tripay */}
                            {c.active ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                <CheckCircle2 className="h-3 w-3" /> Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border shrink-0">
                                <XCircle className="h-3 w-3" /> Nonaktif
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Estimasi Biaya:</span>
                          <span className="font-medium text-foreground">
                            {c.fee_merchant.flat > 0 ? rupiah(c.fee_merchant.flat) : ""}
                            {c.fee_merchant.percent > 0 ? ` + ${c.fee_merchant.percent}%` : ""}
                            {c.fee_merchant.flat === 0 && c.fee_merchant.percent === 0 ? "Gratis Merchant" : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
