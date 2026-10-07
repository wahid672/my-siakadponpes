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
 * Fully supports modern CSS formats and guarantees desktop-consistent layout on all mobile devices.
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
    clone.style.boxSizing = "border-box";

    // 1. Remove interactive/no-print elements
    clone.querySelectorAll(".no-print").forEach((el) => {
      (el as HTMLElement).style.display = "none";
    });

    // 2. Normalize responsive layout to desktop A4 for mobile browsers:
    // Force header to horizontal row
    const headers = clone.querySelectorAll("header");
    headers.forEach((h) => {
      const el = h as HTMLElement;
      el.style.display = "flex";
      el.style.flexDirection = "row";
      el.style.justifyContent = "space-between";
      el.style.alignItems = "flex-start";
    });

    // Force billed to & QR code section to horizontal row
    const sections = clone.querySelectorAll("section");
    sections.forEach((sec) => {
      const el = sec as HTMLElement;
      if (el.classList.contains("sm:flex-row")) {
        el.style.display = "flex";
        el.style.flexDirection = "row";
        el.style.justifyContent = "space-between";
        el.style.alignItems = "flex-start";
      }
    });

    // Force right-alignment for dates & invoice meta
    clone.querySelectorAll(".sm\\:text-right").forEach((el) => {
      (el as HTMLElement).style.textAlign = "right";
    });
    clone.querySelectorAll(".sm\\:items-end").forEach((el) => {
      (el as HTMLElement).style.alignItems = "flex-end";
    });
    clone.querySelectorAll(".sm\\:border-t-0").forEach((el) => {
      (el as HTMLElement).style.borderTop = "none";
      (el as HTMLElement).style.paddingTop = "0";
    });

    // Force all table columns and cells to remain visible (no mobile hiding)
    clone.querySelectorAll("th, td").forEach((cell) => {
      const el = cell as HTMLElement;
      if (el.classList.contains("sm:table-cell") || el.classList.contains("hidden")) {
        el.style.display = "table-cell";
      }
    });

    // Disable table overflow scrolling inside PDF
    clone.querySelectorAll(".overflow-x-auto").forEach((el) => {
      (el as HTMLElement).style.overflow = "visible";
    });

    document.body.appendChild(clone);

    // Wait for all images and QR codes inside the clone to be fully loaded
    const images = Array.from(clone.querySelectorAll("img"));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    let canvas: HTMLCanvasElement;

    try {
      // 1. Try html2canvas-pro with forced desktop emulation windowWidth
      canvas = await html2canvas(clone, {
        scale: 2, // 2x DPI for crystal-sharp print typography
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1024,
        windowHeight: 1440,
      });
    } catch (h2cError) {
      console.warn("[downloadInvoicePdf] html2canvas-pro fallback:", h2cError);
      // 2. Resilient fallback using browser's native SVG foreignObject rasterizer
      const { toCanvas } = await import("html-to-image");
      canvas = await toCanvas(clone, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: 800,
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
