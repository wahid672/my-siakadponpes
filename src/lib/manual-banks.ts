import { getBankIconUrl, normalizeBankLogoUrl } from "./bank-data";

export interface ManualBankAccount {
  id: string;
  bankName: string;
  bankCode?: string; // slug e.g. 'bsi', 'bri'
  accountNumber: string;
  accountHolder: string;
  logoUrl?: string;
  instructions?: string;
  isActive: boolean;
  order?: number;
}

export const DEFAULT_MANUAL_BANKS: ManualBankAccount[] = [
  {
    id: "bank_bsi_default",
    bankName: "Bank Syariah Indonesia (BSI)",
    bankCode: "bsi",
    accountNumber: "7188899901",
    accountHolder: "Bendahara Yayasan Pesantren",
    logoUrl: "/banks/bsi.svg",
    instructions: "Tambahkan berita transfer dengan Nomor Invoice Anda.",
    isActive: true,
    order: 1,
  },
  {
    id: "bank_bri_default",
    bankName: "Bank Rakyat Indonesia (BRI)",
    bankCode: "bri",
    accountNumber: "012301000456501",
    accountHolder: "Yayasan Pondok Pesantren",
    logoUrl: "/banks/bri.svg",
    instructions: "Simpan struk transfer atau tangkapan layar m-banking untuk bukti konfirmasi.",
    isActive: true,
    order: 2,
  },
];

const STORAGE_KEY = "siakad_manual_banks";

function sanitizeBankList(list: ManualBankAccount[]): ManualBankAccount[] {
  return list.map((b) => ({
    ...b,
    logoUrl: normalizeBankLogoUrl(b.logoUrl, b.bankCode),
  }));
}

/**
 * Synchronously retrieves cached manual bank accounts from localStorage or defaults.
 */
export function getCachedManualBankAccounts(): ManualBankAccount[] {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeBankList(parsed);
        }
      }
    } catch {}
  }
  return DEFAULT_MANUAL_BANKS;
}

import { getManualBanksServerFn, saveManualBanksServerFn } from "./settings-server";

/**
 * Retrieves manual bank accounts from database settings table with localStorage fallback.
 */
export async function getManualBankAccounts(): Promise<ManualBankAccount[]> {
  try {
    const data = await getManualBanksServerFn();
    if (data && Array.isArray(data)) {
      const sanitized = sanitizeBankList(data);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      }
      return sanitized;
    }
  } catch (err) {
    console.warn("[ManualBanks] Fetch error:", err);
  }

  return getCachedManualBankAccounts();
}

/**
 * Saves manual bank accounts list to database settings table and synchronizes cache.
 */
export async function saveManualBankAccounts(banks: ManualBankAccount[]): Promise<{
  success: boolean;
  persistedToDb: boolean;
  message?: string;
}> {
  const sanitized = sanitizeBankList(banks);

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent("manual_banks_updated", { detail: sanitized }));
  }

  try {
    const res = await saveManualBanksServerFn({ data: sanitized });
    return {
      success: res.success,
      persistedToDb: res.success,
      message: res.message,
    };
  } catch (err: any) {
    console.error("[ManualBanks] Save exception:", err);
    return { success: true, persistedToDb: false, message: "Tersimpan di memori lokal browser." };
  }
}
