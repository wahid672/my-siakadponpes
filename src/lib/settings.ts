import {
  getTripaySettingsServerFn,
  saveTripaySettingsServerFn,
  getGeneralSettingsServerFn,
  saveGeneralSettingsServerFn,
} from "./settings-server";

export interface TripaySettings {
  mode: "sandbox" | "production";
  merchantCode: string;
  apiKey: string;
  privateKey: string;
  isEnabled: boolean;
}

export const DEFAULT_TRIPAY_CONFIG: TripaySettings = {
  mode: "sandbox",
  merchantCode: "T10469",
  apiKey: "DEV-WqLYW5qy3V6x6BAyZbb60xkJLmYXz0cPJAqwM6qj",
  privateKey: "LX5le-rAseG-TkHmJ-KWo8a-inGpR",
  isEnabled: true,
};

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  isEnabled: boolean;
}

export const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  user: "",
  pass: "",
  fromEmail: "admin@siakadponpes.com",
  fromName: "SIAKAD PONPES",
  isEnabled: false,
};

const STORAGE_KEY = "siakad_tripay_settings";

export interface SaveSettingsResult {
  success: boolean;
  persistedToDb: boolean;
  message?: string;
  error?: string;
}

/**
 * Retrieves Tripay gateway configuration from the database with local storage cache fallback.
 */
export async function getTripaySettings(): Promise<TripaySettings & { source: "database" | "cache" | "default" }> {
  try {
    const res = await getTripaySettingsServerFn();
    if (res) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
      }
      return { ...res, source: "database" };
    }
  } catch (err) {
    console.warn("[Settings] Database fetch failed, checking local cache:", err);
  }

  // Fallback to localStorage cache
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return { ...DEFAULT_TRIPAY_CONFIG, ...JSON.parse(cached), source: "cache" };
      }
    } catch {}
  }

  return { ...DEFAULT_TRIPAY_CONFIG, source: "default" };
}

/**
 * Saves Tripay gateway configuration to the database and syncs to local storage cache.
 */
export async function saveTripaySettings(newSettings: TripaySettings): Promise<SaveSettingsResult> {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    window.dispatchEvent(new CustomEvent("tripay_settings_updated", { detail: newSettings }));
  }

  try {
    const res = await saveTripaySettingsServerFn({ data: newSettings });
    return {
      success: res.success,
      persistedToDb: res.success,
      message: res.message,
    };
  } catch (err: any) {
    return {
      success: true,
      persistedToDb: false,
      message: "Disimpan di memori browser",
      error: err?.message,
    };
  }
}

export interface GeneralSettings {
  institutionName: string;
  subtitle: string;
  email: string;
  phone: string;
  address: string;
  showAddressInInvoice: boolean;
  invoicePrefix: string;
  defaultNotes: string;
  defaultTerms: string;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  institutionName: "SIAKAD PONPES",
  subtitle: "Sistem Informasi Akademik & Keuangan Pesantren Terpadu",
  email: "wahidalimudin672@gmail.com",
  phone: "081234567890",
  address: "Kantor Penagihan & Layanan Pembayaran Santri",
  showAddressInInvoice: false,
  invoicePrefix: "INV",
  defaultNotes: "Pembayaran dapat dilakukan melalui transfer rekening atau QRIS resmi SIAKAD PONPES.",
  defaultTerms: "Invoice ini merupakan dokumen penagihan sah dan berkekuatan hukum.",
};

const GENERAL_STORAGE_KEY = "siakad_general_settings";

/**
 * Synchronously retrieves cached general settings from localStorage or defaults.
 */
export function getCachedGeneralSettings(): GeneralSettings {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(GENERAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...DEFAULT_GENERAL_SETTINGS,
          ...parsed,
          showAddressInInvoice: parsed.showAddressInInvoice !== undefined ? Boolean(parsed.showAddressInInvoice) : false,
        };
      }
    } catch {}
  }
  return DEFAULT_GENERAL_SETTINGS;
}

/**
 * Retrieves general institution settings from database with local storage cache fallback.
 */
export async function getGeneralSettings(): Promise<GeneralSettings> {
  try {
    const res = await getGeneralSettingsServerFn();
    if (res) {
      if (typeof window !== "undefined") {
        localStorage.setItem(GENERAL_STORAGE_KEY, JSON.stringify(res));
      }
      return res;
    }
  } catch (err) {
    console.warn("[Settings] General settings db fetch failed:", err);
  }

  return getCachedGeneralSettings();
}

/**
 * Saves general institution settings to database and syncs to local storage.
 */
export async function saveGeneralSettings(newSettings: GeneralSettings): Promise<SaveSettingsResult> {
  if (typeof window !== "undefined") {
    localStorage.setItem(GENERAL_STORAGE_KEY, JSON.stringify(newSettings));
    window.dispatchEvent(new CustomEvent("general_settings_updated", { detail: newSettings }));
  }

  try {
    const res = await saveGeneralSettingsServerFn({ data: newSettings });
    return {
      success: res.success,
      persistedToDb: res.success,
      message: res.message,
    };
  } catch (err: any) {
    return {
      success: true,
      persistedToDb: false,
      message: "Pengaturan tersimpan di memori browser",
      error: err?.message,
    };
  }
}
