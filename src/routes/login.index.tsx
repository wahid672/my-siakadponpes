import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { getAuthState, homeFor, setLocalSessionToken } from "@/lib/auth";
import { Mail, Lock, Loader2, ArrowRight, ArrowLeft, KeyRound, UserPlus, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/AuthShell";
import { SweetAlertModal } from "@/components/SweetAlertModal";
import { RegisterModal } from "@/components/RegisterModal";
import { ResetPasswordModal } from "@/components/ResetPasswordModal";
import {
  checkEmailExistsServerFn,
  loginWithPasswordServerFn,
} from "@/lib/auth-server";

export const Route = createFileRoute("/login/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Masuk — SIAKAD PONPES" },
      { name: "description", content: "Masuk ke portal SIAKAD PONPES dengan email dan kata sandi." },
      { property: "og:title", content: "Masuk — SIAKAD PONPES" },
      { property: "og:description", content: "Masuk ke portal SIAKAD PONPES dengan email dan kata sandi." },
    ],
  }),
  beforeLoad: async () => {
    const s = await getAuthState();
    if (s) throw redirect({ to: homeFor(s.role) });
  },
  component: LoginPage,
});

const emailSchema = z.string().trim().email("Format alamat email tidak valid").max(255);

function LoginPage() {
  const navigate = useNavigate();

  // Login steps: "email" -> "password"
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Modals state
  const [sweetAlertOpen, setSweetAlertOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Step 1: Check Email
  async function handleCheckEmail(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0]?.message);
    }

    setLoading(true);
    try {
      const res = await checkEmailExistsServerFn({ data: { email: parsed.data } });
      setLoading(false);

      if (!res.success) {
        return toast.error(res.message || "Gagal memeriksa email.");
      }

      if (res.exists) {
        // Email found in DB -> open password column
        setStep("password");
      } else {
        // Email NOT found -> show SweetAlert popup modal
        setSweetAlertOpen(true);
      }
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "Terjadi kesalahan saat memeriksa akun.");
    }
  }

  // Step 2: Login with Password
  async function handleLoginWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      return toast.error("Silakan masukkan kata sandi Anda.");
    }

    setLoading(true);
    try {
      const res = await loginWithPasswordServerFn({
        data: {
          email: email.trim().toLowerCase(),
          password,
        },
      });

      setLoading(false);
      if (!res.success || !res.sessionToken) {
        if (res.requiresReset) {
          // If legacy user without password
          toast.info(res.message);
          setResetModalOpen(true);
          return;
        }
        return toast.error(res.message || "Kata sandi salah.");
      }

      // Login success
      setLocalSessionToken(res.sessionToken);
      toast.success("Berhasil masuk ke akun Anda");
      navigate({ to: homeFor(res.user.role), replace: true });
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "Terjadi kesalahan saat masuk.");
    }
  }

  function handleResetStep() {
    setStep("email");
    setPassword("");
  }

  return (
    <AuthShell>
      {/* Tautan Menuju Website Utama siakadponpes.com */}
      <div className="mb-5 flex justify-center">
        <a
          href="https://siakadponpes.com/"
          className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-all shadow-2xs"
        >
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span>Website Utama: <strong className="font-semibold text-foreground">siakadponpes.com</strong></span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      </div>

      {step === "email" ? (
        // FORM TAHAP 1: INPUT EMAIL
        <form onSubmit={handleCheckEmail} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">
              Alamat Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="nama@pesantren.com"
                className="h-11 pl-10 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Masukkan email yang terdaftar untuk melanjutkan ke pengisian kata sandi.
            </p>
          </div>

          <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Lanjut
          </Button>

          <div className="pt-2 text-center text-sm border-t">
            <p className="text-muted-foreground">
              Belum memiliki akun?{" "}
              <button
                type="button"
                onClick={() => setRegisterOpen(true)}
                className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Daftar Akun Baru
              </button>
            </p>
          </div>
        </form>
      ) : (
        // FORM TAHAP 2: KOLOM PASSWORD TERBUKA
        <form onSubmit={handleLoginWithPassword} className="space-y-5 animate-in fade-in-50 duration-200">
          <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold truncate text-foreground">{email}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetStep}
              className="h-7 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Ganti Email
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-semibold">
                Kata Sandi
              </Label>
              <button
                type="button"
                onClick={() => setResetModalOpen(true)}
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <KeyRound className="h-3 w-3" />
                Lupa Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoFocus
                placeholder="Masukkan kata sandi Anda"
                className="h-11 pl-10 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Masuk ke Sistem
          </Button>

          <div className="pt-2 flex justify-between text-xs text-muted-foreground border-t">
            <button
              type="button"
              onClick={handleResetStep}
              className="hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Kembali
            </button>
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="font-medium text-primary hover:underline"
            >
              Daftar Akun Baru
            </button>
          </div>
        </form>
      )}

      {/* POPUP SWEET ALERT: EMAIL BELUM TERDAFTAR */}
      <SweetAlertModal
        open={sweetAlertOpen}
        onOpenChange={setSweetAlertOpen}
        email={email}
        onRegisterClick={() => setRegisterOpen(true)}
      />

      {/* MODAL PENDAFTARAN AKUN BARU */}
      <RegisterModal
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        initialEmail={email}
      />

      {/* MODAL RESET PASSWORD */}
      <ResetPasswordModal
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        initialEmail={email}
        onSuccess={() => {
          setStep("password");
        }}
      />
    </AuthShell>
  );
}
