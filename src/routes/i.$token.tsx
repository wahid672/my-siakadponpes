import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreditCard,
  Share2,
  Download,
  ChevronRight,
  Building2,
  Zap,
  Check,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { downloadInvoicePdf } from "@/lib/export-pdf";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { InvoicePaymentTable, formatTanggalWaktu } from "@/components/InvoicePaymentTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DEFAULT_TRIPAY_CHANNELS, createTripayTransaction, fetchTripayChannels, getCachedTripayChannels } from "@/lib/tripay";
import { PaymentChannelItem } from "@/lib/domain-types";
import {
  getPublicInvoiceServerFn,
  completePublicPaymentServerFn,
  saveActivePaymentServerFn,
  extractActivePayment,
  cleanInvoiceNotes,
} from "@/lib/public-invoice";
import {
  getGeneralSettings,
  getCachedGeneralSettings,
  GeneralSettings,
  DEFAULT_GENERAL_SETTINGS,
  getTripaySettings,
  getCachedTripaySettings,
} from "@/lib/settings";
import {
  ManualBankAccount,
  getManualBankAccounts,
  getCachedManualBankAccounts,
  getCachedManualTransferEnabled,
  getManualTransferEnabled,
  DEFAULT_MANUAL_BANKS,
} from "@/lib/manual-banks";
import { getBankIconUrl, normalizeBankLogoUrl } from "@/lib/bank-data";
import { rupiah, tanggal } from "@/lib/auth";
import { ActivePaymentCard, ActivePaymentData } from "@/components/ActivePaymentCard";
import { InvoiceQrCode } from "@/components/InvoiceQrCode";
import { formatInvoiceDocName, buildPublicInvoiceUrl } from "@/lib/invoice-utils";

export const Route = createFileRoute("/i/$token")({
  ssr: true,
  head: () => ({
    meta: [
      { title: "Invoice Publik — SIAKAD PONPES" },
      { name: "description", content: "Tinjau dan lakukan pembayaran tagihan resmi SIAKAD PONPES tanpa login." },
      { property: "og:title", content: "Invoice Publik — SIAKAD PONPES" },
      { property: "og:description", content: "Tinjau dan lakukan pembayaran tagihan resmi SIAKAD PONPES tanpa login." },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const res = await getPublicInvoiceServerFn({ data: params.token });
      return {
        invoice: res?.invoice ?? null,
        settings: res?.settings ?? null,
        manualBanks: res?.manualBanks ?? null,
        isTripayEnabled: res?.isTripayEnabled ?? true,
        isManualTransferEnabled: res?.isManualTransferEnabled ?? true,
        tripayChannels: res?.tripayChannels ?? null,
      };
    } catch {
      return {
        invoice: null,
        settings: null,
        manualBanks: null,
        isTripayEnabled: true,
        isManualTransferEnabled: true,
        tripayChannels: null,
      };
    }
  },
  component: PublicInvoicePage,
});

type Item = { description: string; amount: number; quantity?: number; unit?: string };

function PublicInvoicePage() {
  const { token } = Route.useParams();
  const loaderData = Route.useLoaderData() as {
    invoice: any;
    settings: GeneralSettings | null;
    manualBanks: ManualBankAccount[] | null;
    isTripayEnabled?: boolean;
    isManualTransferEnabled?: boolean;
    tripayChannels?: PaymentChannelItem[] | null;
  } | null;
  const initialInvoice = loaderData?.invoice ?? null;
  const initialSettings = loaderData?.settings ?? null;
  const initialManualBanks = loaderData?.manualBanks ?? null;
  const initialTripayChannels = loaderData?.tripayChannels ?? null;
  const qc = useQueryClient();

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedManualBankId, setSelectedManualBankId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activePayment, setActivePayment] = useState<ActivePaymentData | null>(null);
  const [isTripayEnabled, setIsTripayEnabled] = useState<boolean>(() => {
    if (loaderData?.isTripayEnabled !== undefined) return loaderData.isTripayEnabled;
    return getCachedTripaySettings().isEnabled;
  });
  const [isManualTransferEnabled, setIsManualTransferEnabled] = useState<boolean>(() => {
    if (loaderData?.isManualTransferEnabled !== undefined) return loaderData.isManualTransferEnabled;
    return getCachedManualTransferEnabled();
  });
  const [tripayChannels, setTripayChannels] = useState<PaymentChannelItem[]>(() => {
    if (initialTripayChannels && initialTripayChannels.length > 0) return initialTripayChannels;
    return getCachedTripayChannels();
  });
  const [paymentTab, setPaymentTab] = useState<string>(() => {
    const initManual = loaderData?.isManualTransferEnabled !== undefined ? loaderData.isManualTransferEnabled : getCachedManualTransferEnabled();
    const initTripay = loaderData?.isTripayEnabled !== undefined ? loaderData.isTripayEnabled : getCachedTripaySettings().isEnabled;
    if (!initManual && initTripay) return "tripay";
    return "manual";
  });
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(() => {
    return initialSettings || getCachedGeneralSettings();
  });
  const [manualBanks, setManualBanks] = useState<ManualBankAccount[]>(() => {
    return initialManualBanks || getCachedManualBankAccounts();
  });

  useEffect(() => {
    if (!isManualTransferEnabled && isTripayEnabled) {
      setPaymentTab("tripay");
    } else if (isManualTransferEnabled && !isTripayEnabled) {
      setPaymentTab("manual");
    }
  }, [isManualTransferEnabled, isTripayEnabled]);

  useEffect(() => {
    let mounted = true;
    getGeneralSettings().then((cfg) => {
      if (mounted) setGeneralSettings(cfg);
    });
    getManualBankAccounts().then((b) => {
      if (mounted) setManualBanks(b);
    });
    getTripaySettings().then((cfg) => {
      if (mounted) setIsTripayEnabled(cfg.isEnabled);
    });
    getManualTransferEnabled().then((en) => {
      if (mounted) setIsManualTransferEnabled(en);
    });
    fetchTripayChannels(false).then((res) => {
      if (mounted && res?.channels && res.channels.length > 0) {
        setTripayChannels(res.channels);
      }
    });

    const handleUpdate = (e: any) => {
      if (e?.detail) setGeneralSettings(e.detail);
    };
    const handleBanksUpdate = (e: any) => {
      if (e?.detail) setManualBanks(e.detail);
    };
    const handleTripayUpdate = (e: any) => {
      if (e?.detail && typeof e.detail.isEnabled === "boolean") {
        setIsTripayEnabled(e.detail.isEnabled);
      }
    };
    const handleManualToggleUpdate = (e: any) => {
      if (e?.detail && typeof e.detail.isEnabled === "boolean") {
        setIsManualTransferEnabled(e.detail.isEnabled);
      }
    };
    const handleChannelsUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setTripayChannels(e.detail);
      }
    };

    window.addEventListener("general_settings_updated", handleUpdate);
    window.addEventListener("manual_banks_updated", handleBanksUpdate);
    window.addEventListener("tripay_settings_updated", handleTripayUpdate);
    window.addEventListener("manual_transfer_enabled_updated", handleManualToggleUpdate);
    window.addEventListener("tripay_channels_updated", handleChannelsUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("general_settings_updated", handleUpdate);
      window.removeEventListener("manual_banks_updated", handleBanksUpdate);
      window.removeEventListener("tripay_settings_updated", handleTripayUpdate);
      window.removeEventListener("manual_transfer_enabled_updated", handleManualToggleUpdate);
      window.removeEventListener("tripay_channels_updated", handleChannelsUpdate);
    };
  }, []);

  const { data: inv, isLoading } = useQuery({
    queryKey: ["public-invoice", token],
    initialData: initialInvoice,
    queryFn: async () => {
      try {
        const res = await getPublicInvoiceServerFn({ data: token });
        if (res?.success && res.invoice) {
          if (res.settings) setGeneralSettings(res.settings);
          if (res.manualBanks) setManualBanks(res.manualBanks);
          if (res.isTripayEnabled !== undefined) setIsTripayEnabled(res.isTripayEnabled);
          if (res.isManualTransferEnabled !== undefined) setIsManualTransferEnabled(res.isManualTransferEnabled);
          if (res.tripayChannels) setTripayChannels(res.tripayChannels);
          return res.invoice;
        }
      } catch (err) {
        console.warn("Public invoice query error:", err);
      }
      return null;
    },
  });

  // Restore active payment from Database (priority) or localStorage (fallback)
  useEffect(() => {
    if (!inv?.id) return;
    if (inv.status === "paid") {
      localStorage.removeItem(`siakad_active_payment_${inv.id}`);
      setActivePayment(null);
      return;
    }

    // 1. From database
    if (inv.active_payment) {
      const isPast = inv.active_payment.expiredTime
        ? Math.floor(Date.now() / 1000) > inv.active_payment.expiredTime
        : false;
      if (!isPast) {
        setActivePayment(inv.active_payment);
        localStorage.setItem(`siakad_active_payment_${inv.id}`, JSON.stringify(inv.active_payment));
        return;
      }
    }

    // 2. From localStorage
    try {
      const saved = localStorage.getItem(`siakad_active_payment_${inv.id}`);
      if (saved) {
        const parsed: ActivePaymentData = JSON.parse(saved);
        const isPast = parsed.expiredTime ? Math.floor(Date.now() / 1000) > parsed.expiredTime : false;
        if (!isPast) {
          setActivePayment(parsed);
        } else {
          localStorage.removeItem(`siakad_active_payment_${inv.id}`);
        }
      }
    } catch {}
  }, [inv?.id, inv?.status, inv?.active_payment]);

  const docTitle = inv ? formatInvoiceDocName(inv.invoice_number, inv.profile?.organization) : "";

  useEffect(() => {
    if (docTitle) {
      document.title = `${docTitle} — SIAKAD PONPES`;
    }
  }, [docTitle]);

  if (isLoading && !inv) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Memuat data invoice...
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold">Invoice Tidak Ditemukan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tautan invoice ini mungkin tidak valid, kedaluwarsa, atau sudah dihapus.
        </p>
      </div>
    );
  }

  const items = (inv.items as Item[]) ?? [];
  const subtotal = Number(inv.subtotal);
  const tax = (subtotal * Number(inv.tax_rate)) / 100;
  const isPaid = inv.status === "paid";
  const isCancelled = inv.status === "cancelled";
  const isExpired = inv.status === "expired";
  const isPending = inv.status === "pending";
  const isUnpaid = inv.status === "unpaid";
  const activeTripayChannels = tripayChannels.filter((c) => c.active !== false);

  function shareWhatsApp() {
    const url = buildPublicInvoiceUrl(token);
    const text =
      `*Tagihan SIAKAD PONPES*\n` +
      `No. Invoice: ${inv.invoice_number}\n` +
      `Total: ${rupiah(Number(inv.total))}\n` +
      `Status: ${inv.status.toUpperCase()}\n\n` +
      `Selengkapnya: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function handleStartPayment() {
    if (!selectedChannel) return toast.error("Pilih metode pembayaran terlebih dahulu");
    setIsProcessingPayment(true);

    const totalNum = Math.round(Number(inv.total));
    const discountNum = Number(inv.discount || 0);

    let orderItems = items.map((it, idx) => ({
      sku: `ITEM-${idx + 1}`,
      name: it.description,
      price: Math.round(Number(it.amount)),
      quantity: it.quantity || 1,
    }));

    if (items.length === 1 && discountNum > 0) {
      orderItems = [
        {
          sku: "ITEM-1",
          name: `${items[0].description} (Setelah Diskon)`,
          price: totalNum,
          quantity: 1,
        },
      ];
    }

    // Standardized merchantRef using clear separator '__'
    const merchantRef = `${inv.invoice_number}__${Date.now()}`;
    const selectedChObj = tripayChannels.find((c) => c.code === selectedChannel) || DEFAULT_TRIPAY_CHANNELS.find((c) => c.code === selectedChannel);

    // Send request to Tripay API via server function
    const res = await createTripayTransaction({
      method: selectedChannel,
      merchantRef: merchantRef,
      amount: totalNum,
      customerName: inv.profile?.organization || inv.profile?.full_name || "Pelanggan SIAKAD",
      customerEmail: inv.profile?.email || "pelanggan@siakadponpes.com",
      orderItems,
      returnUrl: window.location.href,
    });

    if (res.success && res.data) {
      const newPayment: ActivePaymentData = {
        channel: res.data.payment_name || selectedChObj?.name || selectedChannel,
        methodCode: selectedChannel,
        payCode: res.data.pay_code || res.data.qr_string || "Lihat Instruksi",
        qrUrl: res.data.qr_url,
        checkoutUrl: res.data.checkout_url,
        amount: res.data.amount || totalNum,
        expiredTime: res.data.expired_time,
        instructions: res.data.instructions,
        reference: res.data.reference,
        createdAt: Date.now(),
        logoUrl: selectedChObj?.icon_url || (selectedChannel ? getBankIconUrl(selectedChannel) : undefined),
      };

      // Set in local state
      setActivePayment(newPayment);
      localStorage.setItem(`siakad_active_payment_${inv.id}`, JSON.stringify(newPayment));

      // PERSIST TO DATABASE SO ANY DEVICE/BROWSER SEES THIS ACTIVE PAYMENT
      try {
        await saveActivePaymentServerFn({
          data: {
            invoiceId: inv.id,
            paymentData: newPayment,
          },
        });
      } catch (saveErr) {
        console.warn("[i.$token] Database save warning:", saveErr);
      }

      setPayModalOpen(false);
      toast.success("Metode pembayaran berhasil dipilih dan tersimpan di database!");
      qc.invalidateQueries({ queryKey: ["public-invoice", token] });
    } else {
      toast.error(`Respon Tripay: ${res.message}`);
    }
    setIsProcessingPayment(false);
  }

  async function handleSelectManualBank(bank: ManualBankAccount) {
    if (!inv) return;
    setIsProcessingPayment(true);
    const cleanPhone = (generalSettings.phone || "").replace(/\D/g, "");
    const waText = encodeURIComponent(
      `Assalamu'alaikum, saya ingin konfirmasi pembayaran invoice ${inv.invoice_number}.\n` +
      `Lembaga: ${generalSettings.institutionName}\n` +
      `Total: ${rupiah(Number(inv.total))}\n` +
      `Metode: Transfer Manual ke ${bank.bankName} (${bank.accountNumber} a.n. ${bank.accountHolder})\n\n` +
      `Link Invoice: ${window.location.href}\n` +
      `Mohon dibantu konfirmasi dan verifikasi pembayarannya. Terima kasih.`
    );
    const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waText}` : undefined;

    const newPayment: ActivePaymentData = {
      channel: bank.bankName.toLowerCase().startsWith("bank ")
        ? `Transfer ${bank.bankName}`
        : `Transfer Bank ${bank.bankName}`,
      methodCode: `MANUAL_${bank.bankCode || "BANK"}`,
      payCode: bank.accountNumber,
      amount: Number(inv.total),
      accountHolder: bank.accountHolder,
      logoUrl: normalizeBankLogoUrl(bank.logoUrl, bank.bankCode),
      isManual: true,
      whatsappUrl,
      instructions: [
        {
          title: "Instruksi Transfer Bank Manual",
          steps: [
            `Buka aplikasi m-Banking, ATM, atau SMS banking Anda.`,
            `Lakukan transfer ke rekening ${bank.bankName}: ${bank.accountNumber} atas nama ${bank.accountHolder}.`,
            `Pastikan nominal transfer tepat sebesar ${rupiah(Number(inv.total))}.`,
            bank.instructions || `Tambahkan nomor invoice ${inv.invoice_number} pada berita transfer.`,
            `Simpan bukti transfer dan klik tombol "Konfirmasi WhatsApp" untuk mengirimkan bukti transfer ke admin.`,
          ],
        },
      ],
      reference: `MANUAL-${inv.invoice_number}`,
      createdAt: Date.now(),
    };

    setActivePayment(newPayment);
    localStorage.setItem(`siakad_active_payment_${inv.id}`, JSON.stringify(newPayment));

    try {
      await saveActivePaymentServerFn({
        data: {
          invoiceId: inv.id,
          paymentData: newPayment,
        },
      });
    } catch (saveErr) {
      console.warn("[i.$token] Database save warning:", saveErr);
    }

    setIsProcessingPayment(false);
    setPayModalOpen(false);
    toast.success(`Rekening ${bank.bankName} berhasil dipilih!`);
    qc.invalidateQueries({ queryKey: ["public-invoice", token] });
  }

  async function handleCompletePayment() {
    setIsProcessingPayment(true);
    const methodStr = activePayment
      ? activePayment.accountHolder && activePayment.payCode
        ? `${activePayment.payCode} - ${activePayment.accountHolder}`
        : activePayment.channel
      : "Transfer Manual";

    try {
      await completePublicPaymentServerFn({
        data: {
          invoiceId: inv.id,
          amount: Number(inv.total),
          method: methodStr,
          reference: activePayment?.reference || `TP-${Date.now()}`,
        },
      });
    } catch (err: any) {
      setIsProcessingPayment(false);
      return void toast.error(err.message || "Gagal konfirmasi pembayaran");
    }

    localStorage.removeItem(`siakad_active_payment_${inv.id}`);
    setActivePayment(null);
    setPayModalOpen(false);
    setIsProcessingPayment(false);
    toast.success("Pembayaran Berhasil Dikonfirmasi!");
    qc.invalidateQueries({ queryKey: ["public-invoice", token] });
  }

  function handleResetPayment() {
    setPayModalOpen(true);
  }

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  async function handleDownloadPdf() {
    if (!inv) return;
    setIsDownloadingPdf(true);
    toast.info("Menyiapkan dokumen PDF...");
    const filename = `${formatInvoiceDocName(inv.invoice_number, inv.profile?.organization)}.pdf`;
    try {
      await downloadInvoicePdf({
        elementId: "printable-invoice-paper",
        filename,
        status: inv.status,
        onSuccess: () => {
          toast.success("File PDF berhasil diunduh!");
          setIsDownloadingPdf(false);
        },
        onError: (err) => {
          toast.error("Gagal mengunduh PDF: " + (err?.message || "Terjadi kesalahan"));
          setIsDownloadingPdf(false);
        },
      });
    } catch {
      setIsDownloadingPdf(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Top Floating Actions Bar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status Tagihan:</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isPaid
                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"
                  : isCancelled
                  ? "bg-rose-500/15 text-rose-600 border border-rose-500/20"
                  : isExpired
                  ? "bg-rose-500/15 text-rose-600 border border-rose-500/20"
                  : isPending
                  ? "bg-amber-500/15 text-amber-600 border border-amber-500/20"
                  : "bg-rose-500/15 text-rose-600 border border-rose-500/20"
              }`}
            >
              {isPaid
                ? "Lunas (PAID)"
                : isCancelled
                ? "Dibatalkan (CANCELLED)"
                : isExpired
                ? "Kedaluwarsa (EXPIRED)"
                : isPending
                ? "Pending (MENUNGGU PEMBAYARAN)"
                : "Belum Bayar (UNPAID)"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(isUnpaid || isPending) && !activePayment && (
              <Button onClick={() => setPayModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                <CreditCard className="mr-2 h-4 w-4" /> Bayar Sekarang
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={shareWhatsApp}>
              <Share2 className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="gap-1.5"
            >
              {isDownloadingPdf ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isDownloadingPdf ? "Mengunduh..." : "Unduh PDF"}</span>
            </Button>
          </div>
        </div>

        {/* Active Payment Card (Always displayed on page if payment was generated) */}
        {activePayment && (isUnpaid || isPending) && (
          <ActivePaymentCard
            payment={activePayment}
            onResetPayment={handleResetPayment}
            onSimulatePaid={handleCompletePayment}
            isSimulating={isProcessingPayment}
          />
        )}

        {/* Invoice Paper Document */}
        <article id="printable-invoice-paper" className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-7 md:p-10 shadow-xs print:shadow-none print:border-none">
          {/* Status Ribbon Badge */}
          <div
            className={`absolute right-[-3rem] top-6 rotate-45 px-14 py-1 text-[11px] font-bold uppercase tracking-widest text-center shadow-xs ${
              isPaid
                ? "bg-emerald-600 text-white"
                : isPending
                ? "bg-amber-500 text-white"
                : isCancelled || isExpired
                ? "bg-zinc-600 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {isPaid ? "PAID" : isPending ? "PENDING" : isUnpaid ? "UNPAID" : inv.status.toUpperCase()}
          </div>

          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b pb-5">
            {/* Brand & Lembaga Info */}
            <div className="pr-14 sm:pr-0">
              <Brand />
              <div className="mt-1 text-xs text-muted-foreground">
                <p className="leading-snug">{generalSettings.subtitle || "Sistem Informasi Akademik & Keuangan Pesantren Terpadu"}</p>
                {generalSettings.showAddressInInvoice && generalSettings.address && (
                  <p className="mt-0.5 text-[11px] leading-snug">{generalSettings.address}</p>
                )}
              </div>
            </div>

            {/* Invoice Meta & Dates */}
            <div className="flex flex-col sm:items-end text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50 pr-0 sm:pr-14">
              <div className="flex flex-col sm:items-end">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase leading-none">INVOICE</h1>
                <p className="font-mono text-xs sm:text-sm text-muted-foreground font-semibold mt-1">#{inv.invoice_number}</p>
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <p>
                  <span>Tanggal Terbit: </span>
                  <span className="font-medium text-foreground">{tanggal(inv.issue_date)}</span>
                </p>
                <p>
                  <span>Jatuh Tempo: </span>
                  <span className="font-medium text-foreground">{tanggal(inv.due_date)}</span>
                </p>
                {inv.paid_at && (
                  <p className="font-semibold text-emerald-600">
                    <span>Dibayar: </span>
                    <span>{formatTanggalWaktu(inv.paid_at)}</span>
                  </p>
                )}
              </div>
            </div>
          </header>

          {/* Billed To & QR Code (Posisi Kotak Merah) */}
          <section className="mt-6 border-b pb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ditagihkan Kepada</h2>
              <div className="mt-2 space-y-0.5 text-xs sm:text-sm">
                <p className="font-semibold text-foreground text-sm sm:text-base">
                  {inv.profile?.organization || inv.profile?.full_name || "Lembaga Klien"}
                </p>
                {inv.profile?.full_name && inv.profile?.organization && (
                  <p className="text-xs text-muted-foreground">ATTN: {inv.profile.full_name}</p>
                )}
                {inv.profile?.address && <p className="text-xs text-muted-foreground">{inv.profile.address}</p>}
                <p className="text-xs text-muted-foreground">{inv.profile?.email}</p>
              </div>
            </div>

            {/* QR Code Elegan Publik Invoice */}
            <div className="shrink-0 pt-1 sm:pt-0">
              <InvoiceQrCode url={buildPublicInvoiceUrl(token)} size={84} label="Pindai Invoice" />
            </div>
          </section>

          {/* Items Table */}
          <section className="mt-6">
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-[11px]">
                    <th className="pb-2.5 font-semibold uppercase tracking-wider">Deskripsi Layanan / Tagihan</th>
                    <th className="pb-2.5 text-right font-semibold uppercase tracking-wider">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-muted-foreground">
                        Tidak ada rincian item
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5">
                          <p className="font-medium text-foreground">{it.description}</p>
                          {it.quantity && (
                            <p className="text-[11px] text-muted-foreground">
                              {it.quantity} {it.unit || "item"}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono font-medium">{rupiah(Number(it.amount))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Calculations Summary */}
          <section className="mt-6 flex justify-end border-t pt-5">
            <div className="w-full max-w-xs space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">{rupiah(subtotal)}</span>
              </div>
              {Number(inv.tax_rate) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>PPN ({inv.tax_rate}%)</span>
                  <span className="font-mono">{rupiah(tax)}</span>
                </div>
              )}
              {Number(inv.discount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Diskon</span>
                  <span className="font-mono">-{rupiah(Number(inv.discount))}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-sm sm:text-base font-bold text-foreground">
                <span>Total Tagihan</span>
                <span className="font-mono text-primary">{rupiah(Number(inv.total))}</span>
              </div>
            </div>
          </section>

          {/* Notes & Terms */}
          {inv.notes && (
            <footer className="mt-6 border-t pt-5 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Catatan & Syarat Pembayaran:</p>
              <p className="whitespace-pre-line leading-relaxed">{cleanInvoiceNotes(inv.notes)}</p>
            </footer>
          )}

          {/* Payment Information Table (Shown when status is paid) */}
          <InvoicePaymentTable
            status={inv.status}
            paidAt={inv.paid_at}
            createdAt={inv.created_at}
            total={Number(inv.total)}
            invoiceNumber={inv.invoice_number}
            payments={inv.payments}
            activePayment={activePayment || inv.active_payment}
          />
        </article>
      </div>

      {/* Payment Method Selector Dialog (Manual Bank + Tripay) */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pilih Metode Pembayaran</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3 border text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Total Tagihan:</span>
              <span className="font-bold text-base text-primary">{rupiah(Number(inv.total))}</span>
            </div>

            {isManualTransferEnabled && isTripayEnabled ? (
              <Tabs value={paymentTab} onValueChange={setPaymentTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual" className="flex items-center gap-1.5 text-xs">
                    <Building2 className="h-3.5 w-3.5" /> Transfer Manual
                  </TabsTrigger>
                  <TabsTrigger value="tripay" className="flex items-center gap-1.5 text-xs">
                    <Zap className="h-3.5 w-3.5" /> Otomatis (Tripay)
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Manual Bank Transfer */}
                <TabsContent value="manual" className="space-y-3 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Pilih rekening resmi untuk transfer langsung tanpa biaya admin gateway:
                  </p>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {manualBanks.filter((b) => b.isActive).map((b) => {
                      const logo = normalizeBankLogoUrl(b.logoUrl, b.bankCode);
                      const isSelected = selectedManualBankId === b.id || (!selectedManualBankId && manualBanks.filter((x) => x.isActive)[0]?.id === b.id);
                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedManualBankId(b.id)}
                          className={`cursor-pointer rounded-xl border p-3 transition ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "bg-card hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-14 items-center justify-center rounded-lg border bg-white p-1 shadow-2xs shrink-0">
                                {logo ? (
                                  <img
                                    src={logo}
                                    alt={b.bankName}
                                    className="max-h-full max-w-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <Building2 className="h-5 w-5 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-xs sm:text-sm text-foreground">{b.bankName}</p>
                                <p className="font-mono text-xs font-semibold text-primary">{b.accountNumber}</p>
                                <p className="text-[10px] text-muted-foreground">a.n. {b.accountHolder}</p>
                              </div>
                            </div>

                            <div className="shrink-0 pt-1">
                              <div
                                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                                }`}
                              >
                                {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              </div>
                            </div>
                          </div>

                          {b.instructions && (
                            <p className="mt-2 text-[10px] text-muted-foreground border-t pt-1 italic">
                              {b.instructions}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {manualBanks.filter((b) => b.isActive).length === 0 && (
                      <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                        Belum ada rekening manual yang diaktifkan. Silakan gunakan saluran pembayaran otomatis Tripay.
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPayModalOpen(false)}>
                      Batal
                    </Button>
                    <Button
                      onClick={() => {
                        const activeList = manualBanks.filter((b) => b.isActive);
                        const chosen = activeList.find((b) => b.id === selectedManualBankId) || activeList[0];
                        if (chosen) handleSelectManualBank(chosen);
                        else toast.error("Pilih salah satu rekening bank terlebih dahulu.");
                      }}
                      disabled={manualBanks.filter((b) => b.isActive).length === 0 || isProcessingPayment}
                      className="bg-primary text-primary-foreground font-semibold"
                    >
                      Gunakan Rekening Ini
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab 2: Tripay Gateway */}
                <TabsContent value="tripay" className="space-y-3 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Pilih Virtual Account atau QRIS untuk verifikasi pembayaran otomatis instan:
                  </p>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {activeTripayChannels.map((ch) => (
                      <button
                        key={ch.code}
                        type="button"
                        onClick={() => setSelectedChannel(ch.code)}
                        className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${
                          selectedChannel === ch.code
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "bg-background hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {ch.icon_url && (
                            <img src={ch.icon_url} alt={ch.name} className="h-6 w-auto max-w-10 object-contain shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-semibold">{ch.name}</p>
                            <p className="text-[10px] text-muted-foreground">{ch.group}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}

                    {activeTripayChannels.length === 0 && (
                      <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                        Belum ada saluran pembayaran aktif di akun Tripay. Silakan hubungi pengelola atau aktifkan saluran di dashboard Tripay.
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPayModalOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleStartPayment} disabled={!selectedChannel || isProcessingPayment}>
                      {isProcessingPayment ? "Menghubungi Tripay..." : "Lanjutkan Pembayaran"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            ) : isManualTransferEnabled ? (
              /* Tampilan langsung Transfer Manual jika Tripay OFF */
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-primary" /> Transfer Bank Manual
                </div>

                <p className="text-xs text-muted-foreground">
                  Pilih rekening resmi untuk transfer langsung tanpa biaya admin gateway:
                </p>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {manualBanks.filter((b) => b.isActive).map((b) => {
                    const logo = normalizeBankLogoUrl(b.logoUrl, b.bankCode);
                    const isSelected = selectedManualBankId === b.id || (!selectedManualBankId && manualBanks.filter((x) => x.isActive)[0]?.id === b.id);
                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedManualBankId(b.id)}
                        className={`cursor-pointer rounded-xl border p-3 transition ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "bg-card hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-14 items-center justify-center rounded-lg border bg-white p-1 shadow-2xs shrink-0">
                              {logo ? (
                                <img
                                  src={logo}
                                  alt={b.bankName}
                                  className="max-h-full max-w-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Building2 className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-xs sm:text-sm text-foreground">{b.bankName}</p>
                              <p className="font-mono text-xs font-semibold text-primary">{b.accountNumber}</p>
                              <p className="text-[10px] text-muted-foreground">a.n. {b.accountHolder}</p>
                            </div>
                          </div>

                          <div className="shrink-0 pt-1">
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                              }`}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                          </div>
                        </div>

                        {b.instructions && (
                          <p className="mt-2 text-[10px] text-muted-foreground border-t pt-1 italic">
                            {b.instructions}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {manualBanks.filter((b) => b.isActive).length === 0 && (
                    <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                      Belum ada rekening transfer manual yang diaktifkan. Silakan hubungi pihak pengelola / admin.
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPayModalOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    onClick={() => {
                      const activeList = manualBanks.filter((b) => b.isActive);
                      const chosen = activeList.find((b) => b.id === selectedManualBankId) || activeList[0];
                      if (chosen) handleSelectManualBank(chosen);
                      else toast.error("Pilih salah satu rekening bank terlebih dahulu.");
                    }}
                    disabled={manualBanks.filter((b) => b.isActive).length === 0 || isProcessingPayment}
                    className="bg-primary text-primary-foreground font-semibold"
                  >
                    Gunakan Rekening Ini
                  </Button>
                </div>
              </div>
            ) : isTripayEnabled ? (
              /* Tampilan langsung Tripay jika Transfer Manual OFF (Tab Manual Tersembunyi) */
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold text-foreground">
                  <Zap className="h-4 w-4 text-primary" /> Pembayaran Otomatis (Tripay)
                </div>

                <p className="text-xs text-muted-foreground">
                  Pilih Virtual Account atau QRIS untuk verifikasi pembayaran otomatis instan:
                </p>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activeTripayChannels.map((ch) => (
                    <button
                      key={ch.code}
                      type="button"
                      onClick={() => setSelectedChannel(ch.code)}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition ${
                        selectedChannel === ch.code
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "bg-background hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {ch.icon_url && (
                          <img src={ch.icon_url} alt={ch.name} className="h-6 w-auto max-w-10 object-contain shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-semibold">{ch.name}</p>
                          <p className="text-[10px] text-muted-foreground">{ch.group}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}

                  {activeTripayChannels.length === 0 && (
                    <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                      Belum ada saluran pembayaran aktif di akun Tripay. Silakan hubungi pengelola atau aktifkan saluran di dashboard Tripay.
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPayModalOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleStartPayment} disabled={!selectedChannel || isProcessingPayment}>
                    {isProcessingPayment ? "Menghubungi Tripay..." : "Lanjutkan Pembayaran"}
                  </Button>
                </div>
              </div>
            ) : (
              /* Tampilan jika kedua metode transfer dinonaktifkan */
              <div className="space-y-4 pt-1">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center space-y-2">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                  <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-200">
                    Metode Pembayaran Tidak Tersedia
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Saat ini saluran transfer manual maupun pembayaran otomatis sedang dinonaktifkan oleh administrator. Silakan hubungi pihak pesantren.
                  </p>
                </div>
                <div className="border-t pt-3 flex justify-end">
                  <Button variant="outline" onClick={() => setPayModalOpen(false)}>
                    Tutup
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
