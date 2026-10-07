import { useState, useEffect } from "react";
import { toast } from "sonner";
import { KeyRound, Mail, Lock, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { validatePassword } from "@/lib/password-rules";
import {
  requestResetPasswordOtpServerFn,
  resetPasswordWithOtpServerFn,
} from "@/lib/auth-server";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
  onSuccess?: () => void;
}

export function ResetPasswordModal({
  open,
  onOpenChange,
  initialEmail = "",
  onSuccess,
}: ResetPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleSendOtp() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return toast.error("Masukkan alamat email yang valid");
    }

    setSendingOtp(true);
    try {
      const res = await requestResetPasswordOtpServerFn({ data: { email: cleanEmail } });
      setSendingOtp(false);
      if (!res.success) {
        return toast.error(res.message);
      }
      toast.success("Kode OTP reset password telah dikirim! Pastikan untuk memeriksa Kotak Masuk atau folder SPAM email Anda.");
      setOtpSent(true);
      setCountdown(60);
    } catch (err: any) {
      setSendingOtp(false);
      toast.error(err.message || "Gagal mengirim kode OTP reset password");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) return toast.error("Email wajib diisi.");
    if (!otpCode.trim()) return toast.error("Kode OTP wajib diisi.");

    const check = validatePassword(newPassword);
    if (!check.valid) {
      return toast.error(`Password baru belum memenuhi syarat: ${check.errors.join(", ")}`);
    }

    if (newPassword !== confirmPassword) {
      return toast.error("Konfirmasi password tidak cocok.");
    }

    setSubmitting(true);
    try {
      const res = await resetPasswordWithOtpServerFn({
        data: {
          email: email.trim().toLowerCase(),
          code: otpCode.trim(),
          newPassword,
        },
      });

      setSubmitting(false);
      if (!res.success) {
        return toast.error(res.message);
      }

      toast.success(res.message);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitting(false);
      toast.error(err.message || "Gagal mereset kata sandi.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-500" />
            Reset Kata Sandi
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Masukkan alamat email Anda untuk menerima kode OTP pemulihan kata sandi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Email & Tombol Kirim OTP */}
          <div className="space-y-1.5">
            <Label htmlFor="reset-email" className="text-xs font-semibold">
              Alamat Email Akun
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="nama@email.com"
                  className="pl-9 h-10 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 text-xs font-medium"
                disabled={sendingOtp || countdown > 0}
                onClick={handleSendOtp}
              >
                {sendingOtp ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1" />
                )}
                {countdown > 0 ? `${countdown}s` : otpSent ? "Kirim Ulang" : "Kirim OTP"}
              </Button>
            </div>
          </div>

          {/* Kode OTP */}
          <div className="space-y-1.5">
            <Label htmlFor="reset-otp" className="text-xs font-semibold">
              Kode OTP Pemulihan
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-otp"
                maxLength={6}
                placeholder="6 digit kode OTP"
                className="pl-9 h-10 font-mono tracking-widest text-sm"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
              />
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-200/60 p-2 text-[11px] text-amber-800 space-y-0.5">
              <p className="font-semibold flex items-center gap-1">
                ⚠️ Cek Kotak Masuk (Inbox) & Folder SPAM
              </p>
              <p className="text-amber-700">
                Kode OTP 6-digit dikirim via email. Jika belum masuk di Inbox, pastikan periksa folder <strong>Spam / Junk</strong> Anda.
              </p>
            </div>
          </div>

          {/* Password Baru */}
          <div className="space-y-1.5">
            <Label htmlFor="reset-new-password" className="text-xs font-semibold">
              Kata Sandi Baru
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-new-password"
                type="password"
                placeholder="Buat kata sandi baru"
                className="pl-9 h-10 text-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <PasswordRequirements password={newPassword} />
          </div>

          {/* Konfirmasi Password Baru */}
          <div className="space-y-1.5">
            <Label htmlFor="reset-confirm-password" className="text-xs font-semibold">
              Konfirmasi Kata Sandi Baru
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-confirm-password"
                type="password"
                placeholder="Ulangi kata sandi baru"
                className="pl-9 h-10 text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Tombol Simpan */}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-10 text-sm font-semibold"
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Kata Sandi Baru
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
