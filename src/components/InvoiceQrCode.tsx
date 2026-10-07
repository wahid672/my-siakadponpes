import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { QrCode as QrIcon } from "lucide-react";

interface InvoiceQrCodeProps {
  url: string;
  size?: number;
  label?: string;
  className?: string;
}

export function InvoiceQrCode({
  url,
  size = 84,
  label = "Pindai untuk verifikasi & bayar online",
  className = "",
}: InvoiceQrCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!url) return;
    let mounted = true;

    QRCode.toDataURL(url, {
      margin: 1,
      width: 256, // High-res rendering so PDF print is razor sharp
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (mounted) setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.warn("Failed to generate invoice QR code:", err);
      });

    return () => {
      mounted = false;
    };
  }, [url]);

  if (!url) return null;

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="rounded-xl border border-border/80 bg-white p-1.5 shadow-2xs transition-all hover:border-primary/50">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Code Invoice"
            width={size}
            height={size}
            className="block rounded-lg object-contain"
            style={{ width: `${size}px`, height: `${size}px` }}
          />
        ) : (
          <div
            style={{ width: `${size}px`, height: `${size}px` }}
            className="flex items-center justify-center rounded-lg bg-muted/40 text-muted-foreground"
          >
            <QrIcon className="h-6 w-6 animate-pulse opacity-40" />
          </div>
        )}
      </div>
      {label && (
        <span className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/80 max-w-[110px] leading-tight">
          {label}
        </span>
      )}
    </div>
  );
}
