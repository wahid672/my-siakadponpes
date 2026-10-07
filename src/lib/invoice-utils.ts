/**
 * Utility functions for invoice formatting, filenames, and share messages.
 */

export function formatInvoiceDocName(
  invoiceNumber?: string | null,
  organizationName?: string | null
): string {
  const num = (invoiceNumber || "INV").trim().replace(/[^a-zA-Z0-9_-]/g, "");
  const rawOrg = (organizationName || "Lembaga").trim();
  // Replace spaces with dash and remove special characters
  const org = rawOrg.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "");
  return `${num}-${org}`;
}

export function buildPublicInvoiceUrl(invoiceIdOrToken: string): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://portal.siakadponpes.com";
  return `${origin}/i/${invoiceIdOrToken}`;
}
