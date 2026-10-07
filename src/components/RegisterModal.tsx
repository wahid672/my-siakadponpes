import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building, MapPin, User, Mail, Lock, KeyRound, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PasswordRequirements } from "@/components/PasswordRequirements";
import { validatePassword } from "@/lib/password-rules";
import {
  requestRegisterOtpServerFn,
  registerUserWithOtpServerFn,
} from "@/lib/auth-server";
import { setLocalSessionToken } from "@/lib/auth";

interface RegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
}

export function RegisterModal({
  open,
  onOpenChange,
  initialEmail = "",
}: RegisterModalProps) {
  const navigate = useNavigate();

  const [organization, setOrganization] = useState("");
  const [address, setAddress] = useState("");
  const [pic, setPic] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
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
      const res = await requestRegisterOtpServerFn({ data: { email: cleanEmail } });
      setSendingOtp(false);
      if (!res.success) {
        return toast.error(res.message);
      }
      toast.success("Kode OTP telah dikirim! Pastikan untuk memeriksa Kotak Masuk atau folder SPAM email Anda.");
      setOtpSent(true);
      setCountdown(60);
    } catch (err: any) {
      setSendingOtp(false);
      toast.error(err.message || "Gagal mengirim kode OTP");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!organization.trim()) return toast.error("Nama lembaga wajib diisi.");
    if (!address.trim()) return toast.error("Alamat lembaga wajib diisi.");
    if (!pic.trim()) return toast.error("PIC Attn wajib diisi.");
    if (!email.trim()) return toast.error("Email wajib diisi.");
    if (!otpCode.trim()) return toast.error("Kode OTP wajib diisi.");

    // Validate 3 password conditions
    const check = validatePassword(password);
    if (!check.valid) {
      return toast.error(`Password belum memenuhi syarat: ${check.errors.join(", ")}`);
    }

    if (password !== confirmPassword) {
      return toast.error("Konfirmasi password tidak cocok dengan password yang dimasukkan.");
    }

    setSubmitting(true);
    try {
      const res = await registerUserWithOtpServerFn({
        data: {
          email: email.trim().toLowerCase(),
          code: otpCode.trim(),
          organization: organization.trim(),
          address: address.trim(),
          pic: pic.trim(),
          password,
        },
      });

      setSubmitting(false);
      if (!res.success || !res.sessionToken) {
        return toast.error(res.message || "Pendaftaran gagal.");
      }

      // Store session token and redirect to dashboard
      setLocalSessionToken(res.sessionToken);
      toast.success(res.message || "Pendaftaran berhasil! Mengalihkan ke dashboard...");
      onOpenChange(false);

      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      setSubmitting(false);
      toast.error(err.message || "Terjadi kesalahan saat pendaftaran.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Form Pendaftaran Akun Lembaga / Klien
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Lengkapi data di bawah ini untuk membuat akun dan mengakses sistem SIAKAD PONPES.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* 1. Nama Lembaga */}
          <div className="space-y-1.5">
            <Label htmlFor="organization" className="text-xs font-semibold">
              Nama Lembaga / Pondok Pesantren <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="organization"
                placeholder="Contoh: Pondok Pesantren Al-Hidayah"
                className="pl-9 h-10 text-sm"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 2. Alamat Lembaga */}
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold">
              Alamat Lembaga <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="address"
                rows={2}
                placeholder="Alamat lengkap lembaga / instansi..."
                className="pl-9 text-sm"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 3. PIC Attn */}
          <div className="space-y-1.5">
            <Label htmlFor="pic" className="text-xs font-semibold">
              PIC Attn (Nama Penanggung Jawab) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pic"
                placeholder="Contoh: Ustadz Ahmad Fauzi, S.Pd.I"
                className="pl-9 h-10 text-sm"
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 4. Kolom Email & Tombol Kirim OTP */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-email" className="text-xs font-semibold">
              Alamat Email <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reg-email"
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

          {/* 5. Kolom Kode OTP */}
          <div className="space-y-1.5">
            <Label htmlFor="otp" className="text-xs font-semibold">
              Kode OTP Verifikasi <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="otp"
                maxLength={6}
                placeholder="Masukkan 6 digit kode OTP dari email"
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
                Kode OTP 6-digit dikirim via email. Jika belum muncul di Inbox, silakan periksa folder <strong>Spam / Junk</strong> Anda.
              </p>
            </div>
          </div>

          {/* 6. Kolom Password (3 Syarat) */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-password" className="text-xs font-semibold">
              Kata Sandi (Password) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reg-password"
                type="password"
                placeholder="Buat kata sandi aman"
                className="pl-9 h-10 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Checklist Indikator Syarat Password */}
            <PasswordRequirements password={password} />
          </div>

          {/* 7. Konfirmasi Password */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-confirm" className="text-xs font-semibold">
              Konfirmasi Kata Sandi <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reg-confirm"
                type="password"
                placeholder="Ulangi kata sandi"
                className="pl-9 h-10 text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 8. Tombol Daftar Akun */}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold bg-primary hover:bg-primary/90"
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Daftar Akun Sekarang
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
