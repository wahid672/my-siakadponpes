import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Clock,
  ExternalLink,
  QrCode,
  ShieldCheck,
  MessageSquare,
  Building2,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { normalizeBankLogoUrl } from "@/lib/bank-data";
import { DEFAULT_TRIPAY_CHANNELS } from "@/lib/tripay";

export interface TripayInstructionItem {
  title: string;
  steps: string[];
}

export interface ActivePaymentData {
  channel: string;
  methodCode?: string;
  payCode: string;
  qrUrl?: string;
  checkoutUrl?: string;
  amount: number;
  expiredTime?: number; // Unix timestamp in seconds
  instructions?: TripayInstructionItem[] | string;
  reference?: string;
  createdAt: number;
  accountHolder?: string;
  logoUrl?: string;
  isManual?: boolean;
  whatsappUrl?: string;
}

interface ActivePaymentCardProps {
  payment: ActivePaymentData;
  onResetPayment: () => void;
  onSimulatePaid?: () => void;
  isSimulating?: boolean;
}

export function ActivePaymentCard({
  payment,
  onResetPayment,
  onSimulatePaid,
  isSimulating = false,
}: ActivePaymentCardProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [payment.methodCode, payment.logoUrl]);

  useEffect(() => {
    function updateTimer() {
      if (!payment.expiredTime) return;
      const nowSeconds = Math.floor(Date.now() / 1000);
      const diff = payment.expiredTime - nowSeconds;

      if (diff <= 0) {
        setTimeLeft("Kedaluwarsa");
        return;
      }

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (hours > 0) {
        setTimeLeft(`${hours} jam ${minutes} menit`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}d`);
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [payment.expiredTime]);

  function copyCode() {
    navigator.clipboard.writeText(payment.payCode);
    setCopiedCode(true);
    toast.success("Nomor rekening / pembayaran berhasil disalin!");
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function copyAmount() {
    navigator.clipboard.writeText(String(Math.round(payment.amount)));
    setCopiedAmount(true);
    toast.success("Nominal transfer berhasil disalin!");
    setTimeout(() => setCopiedAmount(false), 2000);
  }

  // Parse instructions safely
  const parsedInstructions: TripayInstructionItem[] = React.useMemo(() => {
    if (Array.isArray(payment.instructions)) {
      return payment.instructions;
    }
    if (typeof payment.instructions === "string") {
      return [
        {
          title: "Panduan Pembayaran",
          steps: payment.instructions
            .split("\n")
            .filter((s) => s.trim().length > 0)
            .map((s) => s.replace(/^[-\d.]+\s*/, "").trim()),
        },
      ];
    }
    return [];
  }, [payment.instructions]);

  const isQris =
    Boolean(payment.qrUrl) ||
    (payment.methodCode || "").toUpperCase() === "QRIS" ||
    (payment.channel || "").toUpperCase().includes("QRIS");

  // Clean bank name & channel display (fix redundant "Transfer Bank Bank ...")
  const { cleanBankTitle, methodBadge } = React.useMemo(() => {
    let raw = payment.channel || "";
    raw = raw.replace(/Transfer\s+Bank\s+Bank\s+/gi, "Transfer Bank ");
    raw = raw.replace(/Bank\s+Bank\s+/gi, "Bank ");
    
    const cleanTitle = raw.replace(/^Transfer\s+(Bank\s+)?/i, "").trim() || raw;
    const badge = payment.isManual ? "Transfer Manual" : "Virtual Account";

    return { cleanBankTitle: cleanTitle, methodBadge: badge };
  }, [payment.channel, payment.isManual]);

  const bankSlug = (payment.methodCode?.replace(/^MANUAL_/, "") || "").toLowerCase();
  const tripayCh = DEFAULT_TRIPAY_CHANNELS.find(
    (c) => c.code.toLowerCase() === bankSlug || c.code.toLowerCase() === (payment.methodCode || "").toLowerCase()
  );
  const logoSrc = normalizeBankLogoUrl(
    payment.logoUrl || tripayCh?.icon_url,
    bankSlug
  );

  return (
    <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs transition-all">
      {/* 1. Header Bar with Status & Countdown Timer */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/60 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-foreground leading-none">
              Menunggu Pembayaran
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {payment.isManual
                ? "Silakan transfer ke rekening resmi di bawah dan konfirmasi pembayaran"
                : "Silakan selesaikan pembayaran sebelum batas waktu berakhir"}
            </p>
          </div>
        </div>

        {timeLeft && (
          <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            <span>Sisa waktu: {timeLeft}</span>
          </div>
        )}
      </div>

      {/* 2. Main Body Grid: Destination Bank Card & Elegant Amount Summary */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Left Column: Bank / Destination Account Card */}
        <div className="flex flex-col justify-between rounded-lg border border-border/70 bg-muted/20 p-4 space-y-3.5">
          {/* Header row with dedicated badge positioning */}
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {payment.isManual ? "Rekening Tujuan" : "Metode Pembayaran"}
            </span>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
              {methodBadge}
            </span>
          </div>

          {/* Bank Profile Row (Bank name has full width) */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-16 sm:w-18 items-center justify-center rounded-lg border bg-white p-1 shadow-2xs shrink-0 overflow-hidden">
              {logoSrc && !imageError ? (
                <img
                  src={logoSrc}
                  alt={cleanBankTitle}
                  className="max-h-full max-w-full object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-xs sm:text-sm text-foreground leading-snug">
                {cleanBankTitle}
              </h4>
              {payment.accountHolder && (
                <p className="text-[11px] text-muted-foreground">
                  a.n. <span className="font-medium text-foreground">{payment.accountHolder}</span>
                </p>
              )}
            </div>
          </div>

          {/* Account Number / QRIS View */}
          {isQris ? (
            <div className="py-2 text-center space-y-2">
              <div className="mx-auto w-44 h-44 bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-center shadow-inner">
                {payment.qrUrl ? (
                  <img
                    src={payment.qrUrl}
                    alt="Kode QRIS Pembayaran"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode className="w-32 h-32 text-slate-800" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pindai QRIS dengan BCA Mobile, Livin', BRImo, GoPay, OVO, ShopeePay, DANA, dll.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground block">
                {payment.isManual ? "Nomor Rekening Bank Resmi" : "Nomor Virtual Account / Kode Bayar"}
              </span>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-card px-3.5 py-2.5 shadow-2xs">
                <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-foreground select-all break-all">
                  {payment.payCode}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyCode}
                  className="h-7 px-2.5 gap-1 shrink-0 bg-background hover:bg-muted text-[11px] font-medium"
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Salin</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Amount & Action Buttons */}
        <div className="flex flex-col justify-between rounded-lg border border-border/70 bg-muted/20 p-4 space-y-3.5">
          {/* Header row with reference */}
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Tagihan
            </span>
            {payment.reference && (
              <span className="rounded-full bg-card border border-border/70 px-2 py-0.5 text-[10px] font-mono text-muted-foreground truncate max-w-[150px]">
                {payment.reference}
              </span>
            )}
          </div>

          {/* Elegant Amount Display Card */}
          <div className="rounded-lg border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card p-3.5 space-y-2 shadow-2xs">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
              Jumlah Transfer Tepat
            </span>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-semibold text-muted-foreground">Rp</span>
                <span className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {Math.round(payment.amount).toLocaleString("id-ID")}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyAmount}
                className="h-7 px-2.5 gap-1 shrink-0 bg-background hover:bg-muted text-[11px] font-medium"
              >
                {copiedAmount ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Salin</span>
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-start gap-1.5 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground leading-normal">
              <span className="text-amber-500 font-bold shrink-0">⚠️</span>
              <span>Pastikan transfer tepat sesuai nominal tanpa pembulatan agar cepat terverifikasi.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5 pt-0.5">
            {payment.whatsappUrl && (
              <Button
                asChild
                size="sm"
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-medium shadow-2xs gap-1.5 h-8.5 text-xs rounded-lg"
              >
                <a href={payment.whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Konfirmasi WhatsApp
                </a>
              </Button>
            )}

            {payment.checkoutUrl && (
              <Button asChild variant="outline" size="sm" className="w-full text-xs h-8 bg-background rounded-lg">
                <a href={payment.checkoutUrl} target="_blank" rel="noopener noreferrer">
                  Buka Halaman Tripay <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetPayment}
              className="w-full text-[11px] h-7 text-muted-foreground hover:text-foreground rounded-lg gap-1"
            >
              <ArrowLeftRight className="h-3 w-3" />
              Ganti Metode Lain
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Instructions Accordion (Collapsed by default) */}
      {parsedInstructions.length > 0 && (
        <div className="border-t border-border/60 bg-card">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="instructions-root" className="border-none">
              <AccordionTrigger className="px-4 py-3 sm:px-5 hover:no-underline text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-left">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                    Tata Cara & Instruksi Pembayaran
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">
                    (Klik untuk melihat petunjuk pembayaran)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 sm:px-5 pt-0 space-y-2">
                {parsedInstructions.length === 1 ? (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
                    <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        1
                      </span>
                      {parsedInstructions[0].title}
                    </p>
                    <ol className="list-decimal list-outside ml-5 space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                      {parsedInstructions[0].steps.map((step, stepIdx) => (
                        <li
                          key={stepIdx}
                          className="[&>b]:font-semibold [&>b]:text-foreground [&>strong]:font-semibold [&>strong]:text-foreground"
                          dangerouslySetInnerHTML={{ __html: step }}
                        />
                      ))}
                    </ol>
                  </div>
                ) : (
                  <Accordion type="single" collapsible defaultValue="sub-0" className="w-full space-y-1.5">
                    {parsedInstructions.map((ins, insIdx) => (
                      <AccordionItem
                        key={insIdx}
                        value={`sub-${insIdx}`}
                        className="rounded-lg border border-border/60 bg-muted/20 px-3.5 py-0.5"
                      >
                        <AccordionTrigger className="text-xs font-medium hover:no-underline py-2">
                          <span className="flex items-center gap-2 text-left">
                            <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {insIdx + 1}
                            </span>
                            <span>{ins.title}</span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1 pb-3">
                          <ol className="list-decimal list-outside ml-5 space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                            {ins.steps.map((step, stepIdx) => (
                              <li
                                key={stepIdx}
                                className="[&>b]:font-semibold [&>b]:text-foreground [&>strong]:font-semibold [&>strong]:text-foreground"
                                dangerouslySetInnerHTML={{ __html: step }}
                              />
                            ))}
                          </ol>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </section>
  );
}
