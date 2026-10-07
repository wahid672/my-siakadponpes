import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export interface DownloadPdfOptions {
  elementId?: string;
  filename?: string;
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

/**
 * Directly downloads the invoice DOM element as a high-resolution A4 PDF file
 * without opening browser print preview.
 * Fully supports modern CSS formats (Tailwind v4 oklch colors).
 */
export async function downloadInvoicePdf(options: DownloadPdfOptions = {}): Promise<void> {
  const {
    elementId = "printable-invoice-paper",
    filename = "Invoice.pdf",
    onStart,
    onSuccess,
    onError,
  } = options;

  onStart?.();

  let clone: HTMLElement | null = null;

  try {
    const original = document.getElementById(elementId);
    if (!original) {
      throw new Error("Dokumen invoice tidak ditemukan di halaman.");
    }

    // Create an off-screen clone with standard A4 paper proportions (800px width)
    // to ensure mobile screens produce the same crisp, professional layout as desktop.
    clone = original.cloneNode(true) as HTMLElement;
    clone.style.width = "800px";
    clone.style.minWidth = "800px";
    clone.style.maxWidth = "800px";
    clone.style.padding = "36px 44px";
    clone.style.position = "fixed";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    clone.style.zIndex = "-9999";
    clone.style.backgroundColor = "#ffffff";
    clone.style.color = "#0f172a";
    clone.style.boxShadow = "none";
    clone.style.border = "none";
    clone.style.borderRadius = "0";

    // Remove any interactive or no-print elements inside the clone
    clone.querySelectorAll(".no-print").forEach((el) => {
      (el as HTMLElement).style.display = "none";
    });

    document.body.appendChild(clone);

    let canvas: HTMLCanvasElement;

    try {
      // 1. Try html2canvas-pro (with full oklch / oklab modern CSS support)
      canvas = await html2canvas(clone, {
        scale: 2, // 2x DPI for ultra-sharp typography
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
    } catch (h2cError) {
      console.warn("[downloadInvoicePdf] html2canvas-pro encountered an issue, falling back to html-to-image:", h2cError);
      // 2. Resilient fallback using browser's native SVG foreignObject rasterizer
      const { toCanvas } = await import("html-to-image");
      canvas = await toCanvas(clone, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
    }

    // Create A4 PDF document
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/jpeg", 0.96);
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

    const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    pdf.save(safeFilename);

    onSuccess?.();
  } catch (err: any) {
    console.error("[downloadInvoicePdf] Error:", err);
    onError?.(err);
    throw err;
  } finally {
    if (clone && clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  }
}
