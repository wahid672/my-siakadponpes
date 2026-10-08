import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export interface DownloadPdfOptions {
  elementId?: string;
  filename?: string;
  status?: string;
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

/**
 * Resolves modern CSS color functions like oklch() to standard RGB/Hex
 * so html2canvas never throws "Unsupported color format" errors on mobile devices.
 */
function normalizeColorsToRgb(root: HTMLElement): void {
  const colorProps = [
    "color",
    "backgroundColor",
    "borderColor",
    "borderTopColor",
    "borderBottomColor",
    "borderLeftColor",
    "borderRightColor",
  ];
  const dummyCanvas = document.createElement("canvas");
  const ctx = dummyCanvas.getContext("2d");
  if (!ctx) return;

  const elements = [root, ...Array.from(root.querySelectorAll("*"))] as HTMLElement[];
  elements.forEach((el) => {
    if (!el.style) return;
    const computed = window.getComputedStyle(el);
    colorProps.forEach((prop) => {
      const val = (computed as any)[prop];
      if (val && typeof val === "string" && (val.includes("oklch") || val.includes("color("))) {
        try {
          ctx.fillStyle = val;
          const resolved = ctx.fillStyle;
          if (resolved) {
            (el.style as any)[prop] = resolved;
          }
        } catch {}
      }
    });
  });
}

/**
 * Directly downloads the invoice DOM element as a high-resolution A4 PDF file.
 * Normalizes layout so mobile phones and desktop browsers produce 100% IDENTICAL,
 * sharp, and beautiful A4 invoice documents.
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

  let sandbox: HTMLElement | null = null;

  try {
    const original = document.getElementById(elementId);
    if (!original) {
      throw new Error("Dokumen invoice tidak ditemukan di halaman.");
    }

    // 1. Create sandbox container in viewport to prevent mobile GPU culling
    sandbox = document.createElement("div");
    sandbox.id = "pdf-render-sandbox";
    sandbox.style.position = "fixed";
    sandbox.style.top = "0";
    sandbox.style.left = "0";
    sandbox.style.width = "800px";
    sandbox.style.minWidth = "800px";
    sandbox.style.zIndex = "-9999";
    sandbox.style.opacity = "0.01";
    sandbox.style.pointerEvents = "none";
    sandbox.style.overflow = "hidden";
    sandbox.style.backgroundColor = "#ffffff";

    // 2. Clone the printable invoice
    const clone = original.cloneNode(true) as HTMLElement;
    clone.style.width = "800px";
    clone.style.minWidth = "800px";
    clone.style.maxWidth = "800px";
    clone.style.padding = "36px 44px";
    clone.style.backgroundColor = "#ffffff";
    clone.style.color = "#0f172a";
    clone.style.boxShadow = "none";
    clone.style.border = "none";
    clone.style.borderRadius = "0";
    clone.style.boxSizing = "border-box";
    clone.style.fontFamily = "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif";
    clone.style.position = "relative";
    clone.style.overflow = "hidden";

    // 3. Remove interactive / no-print elements
    clone.querySelectorAll(".no-print").forEach((el) => {
      (el as HTMLElement).style.display = "none";
    });

    // 4. Resolve Status for Ribbon (guaranteed via options.status or DOM fallback)
    clone.querySelectorAll(".invoice-status-badge").forEach((el) => (el as HTMLElement).remove());

    let statusText = "";
    let ribbonRgb: [number, number, number] = [225, 29, 72]; // Rose 600 default (UNPAID)
    let shouldDrawRibbon = true;

    const rawStatus = (options.status || "").toLowerCase().trim();
    if (rawStatus) {
      if (rawStatus === "paid") {
        statusText = "PAID";
        ribbonRgb = [5, 150, 105]; // Emerald 600
      } else if (rawStatus === "pending") {
        statusText = "PENDING";
        ribbonRgb = [245, 158, 11]; // Amber 500 (100% matches web bg-amber-500)
      } else if (rawStatus === "cancelled") {
        statusText = "DIBATALKAN";
        ribbonRgb = [82, 82, 91]; // Zinc 600
      } else if (rawStatus === "expired") {
        statusText = "KEDALUWARSA";
        ribbonRgb = [82, 82, 91]; // Zinc 600
      } else {
        statusText = "UNPAID";
        ribbonRgb = [225, 29, 72]; // Rose 600
      }
    } else {
      // DOM Fallback
      const ribbonEl = (clone.querySelector(".rotate-45") || original.querySelector(".rotate-45")) as HTMLElement | null;
      if (ribbonEl) {
        const domTxt = (ribbonEl.textContent || ribbonEl.innerText || "").trim().toUpperCase();
        if (domTxt.includes("PAID") || domTxt.includes("LUNAS")) {
          statusText = "PAID";
          ribbonRgb = [5, 150, 105];
        } else if (domTxt.includes("PENDING") || domTxt.includes("MENUNGGU")) {
          statusText = "PENDING";
          ribbonRgb = [245, 158, 11];
        } else if (domTxt.includes("CANCEL") || domTxt.includes("BATAL")) {
          statusText = "DIBATALKAN";
          ribbonRgb = [82, 82, 91];
        } else if (domTxt.includes("EXPIR") || domTxt.includes("KEDALUWARSA")) {
          statusText = "KEDALUWARSA";
          ribbonRgb = [82, 82, 91];
        } else if (domTxt.includes("UNPAID") || domTxt.includes("BELUM")) {
          statusText = "UNPAID";
          ribbonRgb = [225, 29, 72];
        } else if (domTxt) {
          statusText = domTxt;
          ribbonRgb = [217, 119, 6];
        } else {
          statusText = "UNPAID";
          ribbonRgb = [225, 29, 72];
        }
      } else {
        shouldDrawRibbon = false;
      }
    }

    // CRITICAL: Remove the HTML ribbon from the clone completely so html2canvas
    // does not attempt to render CSS transforms (which causes vertical rendering bugs).
    // We will draw a pristine 45-degree vector ribbon directly into the PDF document.
    clone.querySelectorAll(".rotate-45").forEach((el) => (el as HTMLElement).remove());

    // 5. Enforce Desktop A4 Layout for Header (Brand Left, Meta Right)
    const headerEl = clone.querySelector("header");
    if (headerEl) {
      headerEl.style.display = "flex";
      headerEl.style.flexDirection = "row";
      headerEl.style.justifyContent = "space-between";
      headerEl.style.alignItems = "flex-start";
      headerEl.style.borderBottom = "1px solid #e2e8f0";
      headerEl.style.paddingBottom = "20px";
      headerEl.style.gap = "16px";

      // Header Left (Brand & Institution Subtitle)
      const headerLeft = headerEl.children[0] as HTMLElement;
      if (headerLeft) {
        headerLeft.style.display = "flex";
        headerLeft.style.flexDirection = "column";
        headerLeft.style.alignItems = "flex-start";
        headerLeft.style.paddingRight = "0";

        const logoImg = headerLeft.querySelector("img") as HTMLImageElement;
        if (logoImg) {
          logoImg.style.height = "36px";
          logoImg.style.width = "auto";
          logoImg.style.objectFit = "contain";
          logoImg.style.display = "inline-block";
          logoImg.style.visibility = "visible";
        }
      }

      // Header Right (INVOICE, Invoice Number, Issue & Due Date)
      const headerRight = headerEl.children[1] as HTMLElement;
      if (headerRight) {
        headerRight.style.display = "flex";
        headerRight.style.flexDirection = "column";
        headerRight.style.alignItems = "flex-end";
        headerRight.style.textAlign = "right";
        headerRight.style.borderTop = "none";
        headerRight.style.paddingTop = "0";
        headerRight.style.paddingRight = "64px"; // Safe breathing room from diagonal corner ribbon
        headerRight.style.marginRight = "0";

        const titleH1 = headerRight.querySelector("h1");
        if (titleH1) {
          titleH1.style.fontSize = "26px";
          titleH1.style.fontWeight = "900";
          titleH1.style.lineHeight = "1.1";
          titleH1.style.color = "#0f172a";
          titleH1.style.margin = "0";
          titleH1.style.letterSpacing = "0.02em";
        }

        const invNumP = headerRight.querySelector(".font-mono") as HTMLElement;
        if (invNumP) {
          invNumP.style.fontSize = "13px";
          invNumP.style.fontWeight = "600";
          invNumP.style.color = "#475569";
          invNumP.style.marginTop = "4px";
          invNumP.style.marginBottom = "0";
        }
      }
    }

    // 6. Enforce Desktop A4 Layout for Billed To & QR Code
    const sections = Array.from(clone.querySelectorAll("section"));
    const billedSection = sections.find((s) => s.innerText.includes("Ditagihkan") || s.innerText.includes("DITAGIHKAN"));
    if (billedSection) {
      billedSection.style.display = "flex";
      billedSection.style.flexDirection = "row";
      billedSection.style.justifyContent = "space-between";
      billedSection.style.alignItems = "flex-start";
      billedSection.style.borderBottom = "1px solid #e2e8f0";
      billedSection.style.paddingBottom = "20px";
      billedSection.style.marginTop = "20px";
      billedSection.style.gap = "16px";

      const qrWrap = billedSection.children[1] as HTMLElement;
      if (qrWrap) {
        qrWrap.style.flexShrink = "0";
        qrWrap.style.paddingTop = "0";
        qrWrap.style.textAlign = "center";
      }
    }

    // 7. Enforce Desktop A4 Layout for Items Table
    const table = clone.querySelector("table") as HTMLTableElement;
    if (table) {
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.fontSize = "12px";
      table.style.marginTop = "12px";

      table.querySelectorAll("th").forEach((th) => {
        th.style.borderBottom = "1px solid #cbd5e1";
        th.style.padding = "8px 6px";
        th.style.color = "#64748b";
        th.style.fontWeight = "700";
        th.style.fontSize = "11px";
        th.style.textTransform = "uppercase";
        if (th.classList.contains("text-right")) {
          th.style.textAlign = "right";
        }
      });

      table.querySelectorAll("td").forEach((td) => {
        td.style.borderBottom = "1px solid #f1f5f9";
        td.style.padding = "10px 6px";
        td.style.color = "#0f172a";
        if (td.classList.contains("text-right")) {
          td.style.textAlign = "right";
        }
      });
    }

    // 8. Enforce Desktop A4 Layout for Summary Section
    const summarySection = sections.find((s) => s.innerText.includes("Subtotal") && s.innerText.includes("Total Tagihan"));
    if (summarySection) {
      summarySection.style.display = "flex";
      summarySection.style.justifyContent = "flex-end";
      summarySection.style.borderTop = "1px solid #e2e8f0";
      summarySection.style.paddingTop = "16px";
      summarySection.style.marginTop = "16px";

      const summaryCard = summarySection.querySelector("div");
      if (summaryCard) {
        summaryCard.style.width = "300px";
        summaryCard.style.maxWidth = "300px";

        summaryCard.querySelectorAll("div.flex").forEach((row) => {
          const r = row as HTMLElement;
          r.style.display = "flex";
          r.style.flexDirection = "row";
          r.style.justifyContent = "space-between";
          r.style.alignItems = "center";
          r.style.padding = "2px 0";
          r.style.fontSize = "12px";

          if (r.innerText.includes("Total Tagihan")) {
            r.style.borderTop = "1px solid #e2e8f0";
            r.style.paddingTop = "8px";
            r.style.marginTop = "4px";
            r.style.fontWeight = "bold";
            r.style.fontSize = "15px";
            const valSpan = r.children[1] as HTMLElement;
            if (valSpan) {
              valSpan.style.color = "#0f766e";
              valSpan.style.fontWeight = "bold";
            }
          }
        });
      }
    }

    // 9. Convert all images inside clone to inline Base64 Data URLs
    const origImages = Array.from(original.querySelectorAll("img"));
    const cloneImages = Array.from(clone.querySelectorAll("img"));

    await Promise.all(
      cloneImages.map(async (cloneImg, idx) => {
        try {
          const origImg = origImages[idx];
          let base64Url: string | null = null;

          // Strategy A: If original image is already fully loaded in DOM, extract directly via Canvas
          if (origImg && origImg.complete && origImg.naturalWidth > 0) {
            try {
              const canvasEl = document.createElement("canvas");
              canvasEl.width = origImg.naturalWidth;
              canvasEl.height = origImg.naturalHeight;
              const ctx = canvasEl.getContext("2d");
              if (ctx) {
                ctx.drawImage(origImg, 0, 0);
                base64Url = canvasEl.toDataURL("image/png");
              }
            } catch {
              // Canvas tainted fallback
            }
          }

          // Strategy B: If already data URL
          if (!base64Url && cloneImg.src && cloneImg.src.startsWith("data:")) {
            base64Url = cloneImg.src;
          }

          // Strategy C: Fetch directly as blob and convert via FileReader (guaranteed for /emblem.png)
          if (!base64Url && cloneImg.src) {
            try {
              const res = await fetch(cloneImg.src, { cache: "force-cache" });
              if (res.ok) {
                const blob = await res.blob();
                base64Url = await new Promise<string | null>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = () => resolve(null);
                  reader.readAsDataURL(blob);
                });
              }
            } catch {}
          }

          if (base64Url) {
            cloneImg.src = base64Url;
          }

          cloneImg.removeAttribute("onerror");
          cloneImg.onerror = null;
          cloneImg.style.display = "inline-block";
          cloneImg.style.visibility = "visible";
          cloneImg.style.opacity = "1";

          if (cloneImg.decode) {
            await cloneImg.decode().catch(() => {});
          }
        } catch (imgErr) {
          console.warn("[downloadInvoicePdf] Image conversion warning:", imgErr);
        }
      })
    );

    // 10. Normalize all oklch() colors to standard RGB/Hex
    normalizeColorsToRgb(clone);

    // Mount to sandbox
    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    // Wait a brief tick for layout settling
    await new Promise((r) => setTimeout(r, 60));

    // 11. Render Canvas with html2canvas-pro
    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(clone, {
        scale: 2, // 2x DPI for crystal-sharp print typography
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1024,
        windowHeight: 1440,
        imageTimeout: 15000,
      });
    } catch (h2cError) {
      console.warn("[downloadInvoicePdf] Primary renderer failed, attempting fallback:", h2cError);
      const { toCanvas } = await import("html-to-image");
      canvas = await toCanvas(clone, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: 800,
      });
    }

    // 12. Create Standard A4 Portrait PDF Document
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

    // 13. Draw crisp, pixel-perfect 45-degree Vector Corner Ribbon directly on PDF
    if (shouldDrawRibbon && statusText) {
      drawPdfCornerRibbon(pdf, statusText, ribbonRgb);
    }

    const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    pdf.save(safeFilename);

    onSuccess?.();
  } catch (err: any) {
    console.error("[downloadInvoicePdf] Error:", err);
    onError?.(err);
    throw err;
  } finally {
    if (sandbox && sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }
}

/**
 * Draws a pristine, sleek 45-degree status ribbon across the top-right corner
 * of the A4 PDF page, exactly matching the web application design (Image 1).
 */
function drawPdfCornerRibbon(
  pdf: jsPDF,
  text: string,
  rgb: [number, number, number]
): void {
  const [r, g, b] = rgb;
  const pageWidth = 210; // A4 width in mm

  // Precise geometry to match the sleek web ribbon:
  // Inner edge cuts top and right edges at 26mm from the corner
  // Outer edge cuts top and right edges at 17.5mm from the corner
  // Perpendicular thickness = (26 - 17.5) * cos(45°) ≈ 6.0 mm (matching 24px web height)
  const dInner = 26;
  const dOuter = 17.5;

  const p1x = pageWidth - dInner; // 184.0 mm
  const p1y = 0;
  const p2x = pageWidth - dOuter; // 192.5 mm
  const p2y = 0;
  const p3x = pageWidth;          // 210.0 mm
  const p3y = dOuter;             // 17.5 mm
  const p4x = pageWidth;          // 210.0 mm
  const p4y = dInner;             // 26.0 mm

  // 1. Draw solid ribbon background (two triangles forming the diagonal band)
  pdf.setFillColor(r, g, b);
  pdf.triangle(p1x, p1y, p2x, p2y, p3x, p3y, "F");
  pdf.triangle(p1x, p1y, p3x, p3y, p4x, p4y, "F");

  // 2. Draw sharp, mathematically centered uppercase status text
  const upperText = text.toUpperCase();
  const fontSize = upperText.length > 8 ? 6.5 : 7.2;

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(fontSize);

  const textWidth = pdf.getTextWidth(upperText);
  const fontSizeMm = (fontSize * 25.4) / 72;
  const hCap = fontSizeMm * 0.72; // Capital letter optical height

  const dMid = (dInner + dOuter) / 2; // 21.75 mm
  const centerX = pageWidth - dMid / 2; // 199.125 mm
  const centerY = dMid / 2; // 10.875 mm

  // Exact 2D rotation offset to position the bounding box of uppercase text
  // centered precisely along both the 45-degree ribbon length and perpendicular thickness.
  // Avoids jsPDF's built-in align: 'center' rotation bug (which shifts unrotated X).
  const startX = centerX - (textWidth + hCap) / (2 * Math.SQRT2);
  const startY = centerY - (textWidth - hCap) / (2 * Math.SQRT2);

  pdf.text(upperText, startX, startY, {
    angle: -45,
  });
}



