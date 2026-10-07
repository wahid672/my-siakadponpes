import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  HardDriveDownload,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  FileSpreadsheet,
  Layers,
  Users,
  CreditCard,
  FileText,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getDatabaseStatsServerFn,
  exportDatabaseBackupServerFn,
  exportRawSqliteDbServerFn,
  restoreDatabaseBackupServerFn,
  DatabaseStats,
  BackupPayload,
} from "@/lib/backup-server";

export function BackupRestoreCard() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Export states
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingDb, setExportingDb] = useState(false);

  // Restore states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<BackupPayload | null>(null);
  const [restoreMode, setRestoreMode] = useState<"replace" | "merge">("replace");
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoadingStats(true);
    try {
      const res = await getDatabaseStatsServerFn();
      setStats(res);
    } catch (err: any) {
      console.warn("Gagal memuat status database:", err);
    } finally {
      setLoadingStats(false);
    }
  }

  // 1. Download JSON Snapshot Backup
  async function handleDownloadJsonBackup() {
    setExportingJson(true);
    toast.info("Menyiapkan file cadangan JSON...");
    try {
      const res = await exportDatabaseBackupServerFn();
      if (!res.success || !res.backup) {
        throw new Error(res.message || "Gagal membuat backup");
      }

      const jsonStr = JSON.stringify(res.backup, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename || `siakad-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("File cadangan JSON berhasil diunduh!");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunduh cadangan JSON");
    } finally {
      setExportingJson(false);
    }
  }

  // 2. Download Raw SQLite .db File
  async function handleDownloadRawDb() {
    setExportingDb(true);
    toast.info("Menyiapkan salinan database SQLite...");
    try {
      const res = await exportRawSqliteDbServerFn();
      if (!res.success || !res.base64) {
        throw new Error(res.message || "Gagal mengunduh database mentah");
      }

      const binaryStr = atob(res.base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "application/x-sqlite3" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename || `siakad-database-${Date.now()}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("File database SQLite (.db) berhasil diunduh!");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunduh file database mentah");
    } finally {
      setExportingDb(false);
    }
  }

  // 3. Handle file selection
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }

    if (!file.name.endsWith(".json")) {
      toast.error("Format file harus berupa .json hasil backup SIAKAD.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.data || typeof parsed.data !== "object") {
          throw new Error("File tidak memuat data yang valid");
        }
        setFilePreview(parsed);
        toast.info(`File backup terverifikasi: ${file.name}`);
      } catch (err) {
        toast.error("File bukan merupakan format cadangan SIAKAD PONPES yang valid.");
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  // 4. Execute Restore
  async function handleRestoreSubmit() {
    if (!selectedFile || !filePreview) {
      return toast.error("Silakan pilih file backup terlebih dahulu.");
    }

    const confirmMsg =
      restoreMode === "replace"
        ? "PERINGATAN: Mode 'Timpa Penuh' akan MENGHAPUS data saat ini dan menggantinya dengan data dari file backup. Lanjutkan pemulihan?"
        : "Lanjutkan penggabungan data dari file backup ke sistem saat ini?";

    if (!confirm(confirmMsg)) return;

    setIsRestoring(true);
    toast.info("Sedang memproses pemulihan database...");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonText = event.target?.result as string;
          const res = await restoreDatabaseBackupServerFn({
            data: {
              backupJson: jsonText,
              mode: restoreMode,
            },
          });

          if (!res.success) {
            throw new Error(res.message);
          }

          toast.success(res.message);
          setSelectedFile(null);
          setFilePreview(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          fetchStats();
        } catch (innerErr: any) {
          toast.error(innerErr.message || "Gagal memulihkan database");
        } finally {
          setIsRestoring(false);
        }
      };
      reader.readAsText(selectedFile);
    } catch (err: any) {
      setIsRestoring(false);
      toast.error(err.message || "Gagal membaca file");
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* 1. Ringkasan Database & Status Sistem */}
      <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" /> Status Basis Data SQLite
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Informasi kapasitas penyimpanan dan jumlah data transaksi di database aktif.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loadingStats}
            className="h-8 text-xs gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? "animate-spin" : ""}`} />
            Segarkan Status
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Users className="h-4 w-4 text-blue-500" /> Pengguna
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              {stats?.counts.users ?? "-"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Klien & Administrator</div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <FileText className="h-4 w-4 text-amber-500" /> Invoice
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              {stats?.counts.invoices ?? "-"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Total tagihan dibuat</div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <CreditCard className="h-4 w-4 text-emerald-500" /> Pembayaran
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              {stats?.counts.payments ?? "-"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Transaksi pembayaran</div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <HardDriveDownload className="h-4 w-4 text-primary" /> Ukuran File
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              {stats?.fileSizeFormatted ?? "-"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">siakad.db di server</div>
          </div>
        </div>

        {stats?.lastModified && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Terakhir dimodifikasi: {new Date(stats.lastModified).toLocaleString("id-ID")}</span>
          </div>
        )}
      </div>

      {/* 2. Unduh Cadangan Database */}
      <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-xs">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b pb-4">
          <Download className="h-5 w-5 text-emerald-600" /> Cadangkan Data (Backup)
        </h2>
        <p className="text-xs text-muted-foreground mt-2">
          Amankan seluruh data sistem secara berkala. Anda dapat mengunduh cadangan dalam format JSON snapshot portabel atau salinan file database mentah.
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opsi 1: JSON Backup */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <FileJson className="h-4 w-4" /> Cadangan Snapshot JSON (Direkomendasikan)
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Menyimpan seluruh data pengguna, profil, invoice, pembayaran, dan pengaturan dalam format teks terstruktur. Aman, transparan, dan mudah dipulihkan kembali ke server kapan saja.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleDownloadJsonBackup}
              disabled={exportingJson}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-2"
            >
              <Download className="h-4 w-4" />
              {exportingJson ? "Mengunduh..." : "Unduh Cadangan JSON"}
            </Button>
          </div>

          {/* Opsi 2: Raw SQLite File */}
          <div className="rounded-xl border bg-muted/30 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Database className="h-4 w-4 text-primary" /> Salinan Database Mentah (.db)
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Mengunduh file fisik basis data SQLite asli (<code className="text-[11px] font-mono">siakad.db</code>). Berguna untuk arsip cold-storage server atau migrasi server fisik.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadRawDb}
              disabled={exportingDb}
              className="w-full font-semibold text-xs h-9 gap-2"
            >
              <HardDriveDownload className="h-4 w-4" />
              {exportingDb ? "Mempersiapkan..." : "Unduh File siakad.db"}
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Pemulihan Database (Restore) */}
      <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-xs">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b pb-4">
          <Upload className="h-5 w-5 text-amber-600" /> Pulihkan Data (Restore)
        </h2>
        <p className="text-xs text-muted-foreground mt-2">
          Unggah file cadangan JSON yang sebelumnya diunduh untuk memulihkan seluruh data sistem ke database.
        </p>

        <div className="mt-5 space-y-5">
          {/* File Picker */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Pilih File Cadangan (.json)</Label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              disabled={isRestoring}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer border rounded-lg p-2"
            />
          </div>

          {/* File Preview Card */}
          {filePreview && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in-50">
              <div className="flex items-center justify-between text-xs font-bold text-primary">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> File Terverifikasi: {selectedFile?.name}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Versi {filePreview.version || "-"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-lg bg-card p-2 border">
                  <span className="text-muted-foreground text-[10px]">Pengguna:</span>
                  <div className="font-bold text-foreground">{filePreview.counts?.users ?? filePreview.data?.users?.length ?? 0}</div>
                </div>
                <div className="rounded-lg bg-card p-2 border">
                  <span className="text-muted-foreground text-[10px]">Invoice:</span>
                  <div className="font-bold text-foreground">{filePreview.counts?.invoices ?? filePreview.data?.invoices?.length ?? 0}</div>
                </div>
                <div className="rounded-lg bg-card p-2 border">
                  <span className="text-muted-foreground text-[10px]">Pembayaran:</span>
                  <div className="font-bold text-foreground">{filePreview.counts?.payments ?? filePreview.data?.payments?.length ?? 0}</div>
                </div>
                <div className="rounded-lg bg-card p-2 border">
                  <span className="text-muted-foreground text-[10px]">Pengaturan:</span>
                  <div className="font-bold text-foreground">{filePreview.counts?.settings ?? filePreview.data?.settings?.length ?? 0}</div>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground">
                Tanggal Pembuatan Cadangan: {filePreview.exportDate ? new Date(filePreview.exportDate).toLocaleString("id-ID") : "-"}
              </div>
            </div>
          )}

          {/* Pilihan Metode Restore */}
          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Mode Pemulihan Database
            </Label>
            <RadioGroup
              value={restoreMode}
              onValueChange={(val: any) => setRestoreMode(val)}
              className="space-y-2"
              disabled={isRestoring}
            >
              <div className="flex items-start space-x-2.5">
                <RadioGroupItem value="replace" id="r-replace" className="mt-1" />
                <label htmlFor="r-replace" className="text-xs cursor-pointer">
                  <span className="font-bold text-foreground">Timpa Penuh (Replace) — Rekomendasi</span>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Mengosongkan data transaksi saat ini dan menggantinya persis dengan data dari file cadangan. Sangat cocok untuk pemulihan bencana.
                  </p>
                </label>
              </div>

              <div className="flex items-start space-x-2.5">
                <RadioGroupItem value="merge" id="r-merge" className="mt-1" />
                <label htmlFor="r-merge" className="text-xs cursor-pointer">
                  <span className="font-bold text-foreground">Gabungkan Data (Merge / Upsert)</span>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Memperbarui data yang cocok dan menyisipkan data baru tanpa menghapus data lain yang ada di database saat ini.
                  </p>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Peringatan Keamanan */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Peringatan Keamanan:</strong> Pemulihan database akan menimpa/memperbarui data langsung pada server. Disarankan untuk men-download backup data terbaru terlebih dahulu sebelum menjalankan proses restore.
            </div>
          </div>

          {/* Tombol Eksekusi Restore */}
          <Button
            type="button"
            onClick={handleRestoreSubmit}
            disabled={!selectedFile || isRestoring}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-10 px-6 gap-2"
          >
            <Upload className="h-4 w-4" />
            {isRestoring ? "Sedang Memulihkan Database..." : "Jalankan Pemulihan Database"}
          </Button>
        </div>
      </div>
    </div>
  );
}
