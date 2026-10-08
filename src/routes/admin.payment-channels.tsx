import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Layers, CheckCircle2, XCircle, ShieldCheck, Zap, Building2, AlertTriangle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DEFAULT_TRIPAY_CHANNELS } from "@/lib/tripay";
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
  const [channels, setChannels] = useState<PaymentChannelItem[]>(DEFAULT_TRIPAY_CHANNELS);
  const [tripayConfig, setTripayConfig] = useState(() => getCachedTripaySettings());

  useEffect(() => {
    let mounted = true;
    getTripaySettings().then((cfg) => {
      if (mounted) setTripayConfig(cfg);
    });
    const handleUpdate = (e: any) => {
      if (e?.detail) setTripayConfig(e.detail);
    };
    window.addEventListener("tripay_settings_updated", handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener("tripay_settings_updated", handleUpdate);
    };
  }, []);

  function toggleChannel(code: string) {
    setChannels((prev) =>
      prev.map((c) => {
        if (c.code !== code) return c;
        const nextState = !c.active;
        toast.info(`Saluran ${c.name} ${nextState ? "diaktifkan" : "dinonaktifkan"}`);
        return { ...c, active: nextState };
      })
    );
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
              onClick={() => toast.success("Daftar saluran pembayaran telah diperbarui dari Tripay")}
              className="shrink-0"
            >
              <Zap className="mr-2 h-4 w-4" /> Sinkronisasi Tripay
            </Button>
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
                    className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition hover:border-primary/40"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">{c.name}</span>
                        <Switch checked={c.active} onCheckedChange={() => toggleChannel(c.code)} />
                      </div>
                      <p className="font-mono text-xs text-muted-foreground uppercase">{c.code}</p>
                    </div>

                    <div className="mt-4 border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Estimasi Biaya:</span>
                      <span className="font-medium text-foreground">
                        {c.fee_merchant.flat > 0 ? rupiah(c.fee_merchant.flat) : ""}
                        {c.fee_merchant.percent > 0 ? ` + ${c.fee_merchant.percent}%` : ""}
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
