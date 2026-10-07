import { createServerFn } from "@tanstack/react-start";
import { sqlite } from "./db";
import {
  TripaySettings,
  DEFAULT_TRIPAY_CONFIG,
  GeneralSettings,
  DEFAULT_GENERAL_SETTINGS,
} from "./settings";
import {
  SmtpConfig,
  DEFAULT_SMTP_CONFIG,
  testSmtpConnection,
} from "./smtp";
import { ManualBankAccount, DEFAULT_MANUAL_BANKS } from "./manual-banks";

export const getTripaySettingsServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<TripaySettings> => {
    try {
      const row = sqlite.prepare("SELECT value FROM settings WHERE key = 'tripay'").get() as
        | { value: string }
        | undefined;
      if (row?.value) {
        const val = JSON.parse(row.value);
        return {
          mode: val.mode || "sandbox",
          merchantCode: val.merchantCode || val.merchant_code || DEFAULT_TRIPAY_CONFIG.merchantCode,
          apiKey: val.apiKey || val.api_key || DEFAULT_TRIPAY_CONFIG.apiKey,
          privateKey: val.privateKey || val.private_key || DEFAULT_TRIPAY_CONFIG.privateKey,
          isEnabled: val.isEnabled !== undefined ? val.isEnabled : (val.is_enabled ?? true),
        };
      }
    } catch (err) {
      console.warn("[Settings] Error loading Tripay settings:", err);
    }
    return DEFAULT_TRIPAY_CONFIG;
  }
);

export const saveTripaySettingsServerFn = createServerFn({ method: "POST" })
  .validator((settings: TripaySettings) => settings)
  .handler(async ({ data: settings }) => {
    try {
      sqlite
        .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('tripay', ?, ?)")
        .run(JSON.stringify(settings), new Date().toISOString());
      return { success: true, message: "Konfigurasi Tripay berhasil disimpan di SQLite!" };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal menyimpan konfigurasi Tripay" };
    }
  });

export const getGeneralSettingsServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<GeneralSettings> => {
    try {
      const row = sqlite.prepare("SELECT value FROM settings WHERE key = 'general'").get() as
        | { value: string }
        | undefined;
      if (row?.value) {
        const val = JSON.parse(row.value);
        return {
          ...DEFAULT_GENERAL_SETTINGS,
          ...val,
          showAddressInInvoice:
            val.showAddressInInvoice !== undefined ? Boolean(val.showAddressInInvoice) : false,
        };
      }
    } catch (err) {
      console.warn("[Settings] Error loading general settings:", err);
    }
    return DEFAULT_GENERAL_SETTINGS;
  }
);

export const saveGeneralSettingsServerFn = createServerFn({ method: "POST" })
  .validator((settings: GeneralSettings) => settings)
  .handler(async ({ data: settings }) => {
    try {
      sqlite
        .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('general', ?, ?)")
        .run(JSON.stringify(settings), new Date().toISOString());
      return { success: true, message: "Pengaturan lembaga berhasil disimpan di SQLite!" };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal menyimpan pengaturan lembaga" };
    }
  });

export const getManualBanksServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ManualBankAccount[]> => {
    try {
      const row = sqlite.prepare("SELECT value FROM settings WHERE key = 'manual_banks'").get() as
        | { value: string }
        | undefined;
      if (row?.value) {
        const val = JSON.parse(row.value);
        if (Array.isArray(val)) return val;
      }
    } catch (err) {
      console.warn("[Settings] Error loading manual banks:", err);
    }
    return DEFAULT_MANUAL_BANKS;
  }
);

export const saveManualBanksServerFn = createServerFn({ method: "POST" })
  .validator((banks: ManualBankAccount[]) => banks)
  .handler(async ({ data: banks }) => {
    try {
      sqlite
        .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('manual_banks', ?, ?)")
        .run(JSON.stringify(banks), new Date().toISOString());
      return { success: true, message: "Rekening bank manual berhasil disimpan di SQLite!" };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal menyimpan rekening bank" };
    }
  });

export const getSmtpSettingsServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SmtpConfig> => {
    try {
      const row = sqlite.prepare("SELECT value FROM settings WHERE key = 'smtp'").get() as
        | { value: string }
        | undefined;
      if (row?.value) {
        const val = JSON.parse(row.value);
        return {
          ...DEFAULT_SMTP_CONFIG,
          ...val,
          port: Number(val.port || 465),
          secure: val.secure !== undefined ? Boolean(val.secure) : true,
          isEnabled: Boolean(val.isEnabled),
        };
      }
    } catch (err) {
      console.warn("[Settings] Error loading SMTP config:", err);
    }
    return DEFAULT_SMTP_CONFIG;
  }
);

export const saveSmtpSettingsServerFn = createServerFn({ method: "POST" })
  .validator((config: SmtpConfig) => config)
  .handler(async ({ data: config }) => {
    try {
      sqlite
        .prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('smtp', ?, ?)")
        .run(JSON.stringify(config), new Date().toISOString());
      return { success: true, message: "Konfigurasi SMTP berhasil disimpan di SQLite!" };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal menyimpan konfigurasi SMTP" };
    }
  });

export const testSmtpSettingsServerFn = createServerFn({ method: "POST" })
  .validator((params: { config: SmtpConfig; targetEmail: string }) => params)
  .handler(async ({ data: { config, targetEmail } }) => {
    return await testSmtpConnection(config, targetEmail);
  });
