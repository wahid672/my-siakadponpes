import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle2,
  CreditCard,
  ChevronRight,
  ExternalLink,
  Building2,
  Zap,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  getPublicInvoiceServerFn,
  completePublicPaymentServerFn,
  saveActivePaymentServerFn,
} from "@/lib/public-invoice";
import { downloadInvoicePdf } from "@/lib/export-pdf";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { InvoicePaymentTable } from "@/components/InvoicePaymentTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DEFAULT_TRIPAY_CHANNELS, createTripayTransaction } from "@/lib/tripay";
import { rupiah, tanggal } from "@/lib/auth";
import { ActivePaymentCard, ActivePaymentData } from "@/components/ActivePaymentCard";
import {
  getGeneralSettings,
  getCachedGeneralSettings,
  GeneralSettings,
  DEFAULT_GENERAL_SETTINGS,
} from "@/lib/settings";
import {
  ManualBankAccount,
  getManualBankAccounts,
  getCachedManualBankAccounts,
} from "@/lib/manual-banks";
import { getBankIconUrl, normalizeBankLogoUrl } from "@/lib/bank-data";
import { cleanInvoiceNotes } from "@/lib/public-invoice";
import { InvoiceQrCode } from "@/components/InvoiceQrCode";
import { formatInvoiceDocName, buildPublicInvoiceUrl } from "@/lib/invoice-utils";

type Item = { description: string; amount: number; quantity?: number; unit?: string };

export const Route = createFileRoute("/_user/invoice/$id")({
  head: () => ({
    meta: [
      { title: "Detail Invoice — SIAKAD PONPES" },
      { name: "description", content: "Detail invoice resmi SIAKAD PONPES." },
      { property: "og:title", content: "Detail Invoice — SIAKAD PONPES" },
      { property: "og:description", content: "Detail invoice resmi SIAKAD PONPES." },
    ],
  }),
  component: InvoiceView,
});

function InvoiceView() {
  const { id } = Route.useParams();
  const { auth } = Route.useRouteContext();
  const qc = useQueryClient();

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedManualBankId, setSelectedManualBankId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activePayment, setActivePayment] = useState<ActivePaymentData | null>(null);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(() => getCachedGeneralSettings());
  const [manualBanks, setManualBanks] = useState<ManualBankAccount[]>(() => getCachedManualBankAccounts());
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    let mounted = true;
    getGeneralSettings().then((cfg) => {
      if (mounted) setGeneralSettings(cfg);
    });
    getManualBankAccounts().then((b) => {
      if (mounted) setManualBanks(b);
    });

    const handleUpdate = (e: any) => {
      if (e?.detail) setGeneralSettings(e.detail);
    };
    const handleBanksUpdate = (e: any) => {
      if (e?.detail) setManualBanks(e.detail);
    };
    window.addEventListener("general_settings_updated", handleUpdate);
    window.addEventListener("manual_banks_updated", handleBanksUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("general_settings_updated", handleUpdate);
      window.removeEventListener("manual_banks_updated", handleBanksUpdate);
    };
  }, []);

  const { data: inv, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await getPublicInvoiceServerFn({ data: id });
      return res.invoice;
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
      const isExpired = inv.active_payment.expiredTime
        ? Math.floor(Date.now() / 1000) > inv.active_payment.expiredTime
        : false;
      if (!isExpired) {
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
        const isExpired = parsed.expiredTime ? Math.floor(Date.now() / 1000) > parsed.expiredTime : false;
        if (!isExpired) {
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

  if (isLoading) return <p className="text-muted-foreground p-8">Memuat data invoice…</p>;
  if (!inv) return <p className="text-muted-foreground p-8">Invoice tidak ditemukan.</p>;

  const items = (inv.items as Item[]) ?? [];
  const subtotal = Number(inv.subtotal);
  const tax = (subtotal * Number(inv.tax_rate)) / 100;
  const back = auth.role === "admin" ? "/admin/invoices" : "/dashboard";
  const publicShareUrl = buildPublicInvoiceUrl(inv.id);

  function shareWhatsApp() {
    const text =
      `*Tagihan SIAKAD PONPES*\n` +
      `No. Invoice: ${inv!.invoice_number}\n` +
      `Total: ${rupiah(Number(inv!.total))}\n` +
      `Status: ${inv!.status.toUpperCase()}\n\n` +
      `Selengkapnya: ${publicShareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function copyPublicLink() {
    navigator.clipboard.writeText(publicShareUrl);
    toast.success("Tautan publik disalin ke clipboard!");
  }

  async function markPaid() {
    const methodStr = activePayment
      ? activePayment.accountHolder && activePayment.payCode
        ? `${activePayment.payCode} - ${activePayment.accountHolder}`
        : activePayment.channel
      : "Transfer Manual / Admin";

    try {
      const res = await completePublicPaymentServerFn({
        data: {
          invoiceId: inv!.id,
          amount: inv!.total,
          method: methodStr,
          reference: `MANUAL-${Date.now().toString().slice(-6)}`,
        },
      });

      if (!res.success) {
        return void toast.error(res.message || "Gagal memperbarui status");
      }

      localStorage.removeItem(`siakad_active_payment_${inv!.id}`);
      setActivePayment(null);
      toast.success("Invoice ditandai lunas");
      qc.invalidateQueries();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui status");
    }
  }

  async function handleStartPayment() {
    if (!selectedChannel) return toast.error("Pilih metode pembayaran terlebih dahulu");
    setIsProcessingPayment(true);

    const totalNum = Math.round(Number(inv!.total));
    const discountNum = Number(inv!.discount || 0);

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

    // Standardized merchantRef using '__' delimiter
    const merchantRef = `${inv!.invoice_number}__${Date.now()}`;
    const selectedChObj = DEFAULT_TRIPAY_CHANNELS.find((c) => c.code === selectedChannel);

    // Send real request to Tripay API via server function
    const res = await createTripayTransaction({
      method: selectedChannel,
      merchantRef: merchantRef,
      amount: totalNum,
      customerName: inv!.profile?.organization || inv!.profile?.full_name || "Pelanggan SIAKAD",
      customerEmail: inv!.profile?.email || "pelanggan@siakadponpes.com",
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

      setActivePayment(newPayment);
      localStorage.setItem(`siakad_active_payment_${inv!.id}`, JSON.stringify(newPayment));

      // Persist to database
      try {
        const { saveActivePaymentServerFn } = await import("@/lib/public-invoice");
        await saveActivePaymentServerFn({
          data: {
            invoiceId: inv!.id,
            paymentData: newPayment,
          },
        });
      } catch (err) {
        console.warn("[_user.invoice] DB save error:", err);
      }

      setPayModalOpen(false);
      toast.success("Kode pembayaran berhasil diterbitkan dan tersimpan di database!");
      qc.invalidateQueries();
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
      const { saveActivePaymentServerFn } = await import("@/lib/public-invoice");
      await saveActivePaymentServerFn({
        data: {
          invoiceId: inv.id,
          paymentData: newPayment,
        },
      });
    } catch (saveErr) {
      console.warn("[_user.invoice] Database save warning:", saveErr);
    }

    setIsProcessingPayment(false);
    setPayModalOpen(false);
    toast.success(`Rekening ${bank.bankName} berhasil dipilih!`);
    qc.invalidateQueries();
  }

  async function handleCompletePayment() {
    setIsProcessingPayment(true);
    const methodStr = activePayment
      ? activePayment.accountHolder && activePayment.payCode
        ? `${activePayment.payCode} - ${activePayment.accountHolder}`
        : activePayment.channel
      : "Transfer Manual";

    try {
      const res = await completePublicPaymentServerFn({
        data: {
          invoiceId: inv!.id,
          amount: inv!.total,
          method: methodStr,
          reference: activePayment?.reference || `TP-${Date.now()}`,
        },
      });

      setIsProcessingPayment(false);
      if (!res.success) {
        return toast.error(res.message || "Gagal memperbarui status");
      }

      localStorage.removeItem(`siakad_active_payment_${inv!.id}`);
      setActivePayment(null);
      setPayModalOpen(false);
      toast.success("Pembayaran Berhasil Dikonfirmasi!");
      qc.invalidateQueries();
    } catch (err: any) {
      setIsProcessingPayment(false);
      toast.error(err.message || "Gagal memperbarui status");
    }
  }

  const handleDownloadPdf = async () => {
    const filename = `${formatInvoiceDocName(inv.invoice_number, inv.profile?.organization)}.pdf`;
    await downloadInvoicePdf({
      elementId: "printable-invoice-paper",
      filename,
      onStart: () => {
        setIsDownloadingPdf(true);
        toast.info("Menyiapkan dokumen PDF...");
      },
      onSuccess: () => {
        setIsDownloadingPdf(false);
        toast.success("File PDF berhasil diunduh!");
      },
      onError: (err) => {
        setIsDownloadingPdf(false);
        toast.error("Gagal mengunduh PDF: " + err.message);
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Top Bar Actions */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <div className="flex flex-wrap gap-2">
          {(inv.status === "unpaid" || inv.status === "pending") && !activePayment && (
            <Button onClick={() => setPayModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <CreditCard className="mr-1.5 h-4 w-4" /> Bayar Sekarang
            </Button>
          )}
          {auth.role === "admin" && (inv.status === "unpaid" || inv.status === "pending") && (
            <Button variant="secondary" onClick={markPaid}>
              <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" /> Tandai Lunas
            </Button>
          )}
          <Button variant="outline" onClick={shareWhatsApp}>
            <Share2 className="mr-1.5 h-4 w-4" /> WhatsApp
          </Button>
          <Button variant="outline" onClick={copyPublicLink}>
            Salin Link Publik
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="gap-1.5"
          >
            {isDownloadingPdf ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            <span>{isDownloadingPdf ? "Mengunduh..." : "Unduh PDF"}</span>
          </Button>
        </div>
      </div>

      {/* Active Payment Card (Persisted directly on page) */}
      {activePayment && (inv.status === "unpaid" || inv.status === "pending") && (
        <ActivePaymentCard
          payment={activePayment}
          onResetPayment={() => setPayModalOpen(true)}
          onSimulatePaid={handleCompletePayment}
          isSimulating={isProcessingPayment}
        />
      )}

      {/* Printable Invoice Paper Document */}
      <article id="printable-invoice-paper" className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-7 md:p-10 shadow-xs print:shadow-none print:border-none">
        {/* Ribbon Status */}
        <div
          className={`absolute right-[-3rem] top-6 rotate-45 px-14 py-1 text-[11px] font-bold uppercase tracking-widest text-center shadow-xs ${
            inv.status === "paid"
              ? "bg-emerald-600 text-white"
              : inv.status === "cancelled"
              ? "bg-rose-600 text-white"
              : "bg-amber-500 text-white"
          }`}
        >
          {inv.status.toUpperCase()}
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
          <div className="flex flex-col sm:items-end text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
            <div className="flex flex-col sm:items-end">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase leading-none">INVOICE</h1>
              <p className="font-mono text-xs sm:text-sm text-muted-foreground font-semibold mt-1">#{inv.invoice_number}</p>
            </div>
            <div className="mt-2.5 space-y-0.5 text-xs text-muted-foreground">
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
                  <span>{tanggal(inv.paid_at)}</span>
                </p>
              )}
            </div>
          </div>
        </header>

        {/* Billed to & QR Code (Posisi Kotak Merah) */}
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
            <InvoiceQrCode url={publicShareUrl} size={84} label="Pindai Invoice" />
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

        {/* Totals */}
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

        {/* Notes */}
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

      {/* Payment Selection Modal (Manual Bank + Tripay) */}
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

            <Tabs defaultValue="manual" className="w-full">
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
                  {DEFAULT_TRIPAY_CHANNELS.map((ch) => (
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
