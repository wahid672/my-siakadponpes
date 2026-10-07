import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Lock, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { validatePassword } from "@/lib/password-rules";
import { changePasswordServerFn } from "@/lib/auth-server";
import { getLocalSessionToken } from "@/lib/auth";

export function ChangePasswordCard() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = getLocalSessionToken();
    if (!token) {
      return toast.error("Sesi tidak ditemukan. Silakan login kembali.");
    }

    const check = validatePassword(newPassword);
    if (!check.valid) {
      return toast.error(`Password baru belum memenuhi syarat: ${check.errors.join(", ")}`);
    }

    if (newPassword !== confirmPassword) {
      return toast.error("Konfirmasi password baru tidak cocok.");
    }

    setSaving(true);
    try {
      const res = await changePasswordServerFn({
        data: {
          sessionToken: token,
          oldPassword: oldPassword || undefined,
          newPassword,
        },
      });

      setSaving(false);
      if (!res.success) {
        return toast.error(res.message);
      }

      toast.success(res.message || "Kata sandi berhasil diperbarui!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setSaving(false);
      toast.error(err.message || "Gagal memperbarui kata sandi.");
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-xs space-y-6">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Ganti Kata Sandi Akun</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Perbarui kata sandi Anda secara berkala untuk menjaga keamanan akses sistem.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div className="space-y-1.5">
          <Label htmlFor="old-pass" className="text-xs font-semibold">
            Kata Sandi Saat Ini
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="old-pass"
              type="password"
              placeholder="Masukkan kata sandi lama Anda"
              className="pl-9 h-10 text-sm"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-pass" className="text-xs font-semibold">
            Kata Sandi Baru
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="new-pass"
              type="password"
              placeholder="Masukkan kata sandi baru"
              className="pl-9 h-10 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          {/* Indikator Syarat Password */}
          <PasswordRequirements password={newPassword} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-pass" className="text-xs font-semibold">
            Konfirmasi Kata Sandi Baru
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm-pass"
              type="password"
              placeholder="Ketik ulang kata sandi baru"
              className="pl-9 h-10 text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={saving} className="font-semibold text-xs h-10">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Simpan Perubahan Kata Sandi
          </Button>
        </div>
      </form>
    </div>
  );
}
