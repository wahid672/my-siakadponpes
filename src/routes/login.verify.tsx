import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { getAuthState, homeFor, setLocalSessionToken } from "@/lib/auth";
import { verifyOtpServerFn, requestOtpServerFn } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthShell } from "@/components/AuthShell";

const MAX_ATTEMPTS = 5;
const COOLDOWN = 60;

export const Route = createFileRoute("/login/verify")({
  ssr: false,
  validateSearch: z.object({ email: z.string().email().catch("") }),
  head: () => ({
    meta: [
      { title: "Verifikasi OTP — SIAKAD PONPES" },
      { name: "description", content: "Masukkan 6 digit kode OTP yang dikirim ke email Anda." },
      { property: "og:title", content: "Verifikasi OTP — SIAKAD PONPES" },
      { property: "og:description", content: "Masukkan 6 digit kode OTP yang dikirim ke email Anda." },
    ],
  }),
  beforeLoad: async ({ search }) => {
    const s = await getAuthState();
    if (s) throw redirect({ to: homeFor(s.role) });
    if (!search.email) throw redirect({ to: "/login" });
  },
  component: VerifyPage,
});

function VerifyPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [left, setLeft] = useState(() => {
    const sent = Number(sessionStorage.getItem("otp_sent_at") || 0);
    return Math.max(0, COOLDOWN - Math.floor((Date.now() - sent) / 1000));
  });

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  async function verify() {
    if (code.length !== 6) return void toast.error("Masukkan 6 digit kode OTP");
    if (attempts >= MAX_ATTEMPTS) return void toast.error("Terlalu banyak percobaan. Silakan kirim ulang kode.");
    setLoading(true);
    try {
      const res = await verifyOtpServerFn({ data: { email, code } });
      if (!res.success || !res.sessionToken) {
        setLoading(false);
        setAttempts((a) => a + 1);
        setCode("");
        return void toast.error(res.message || "Kode OTP salah atau sudah kedaluwarsa.");
      }
      setLocalSessionToken(res.sessionToken);
      const s = await getAuthState();
      setLoading(false);
      toast.success("Berhasil masuk");
      navigate({ to: s ? homeFor(s.role) : "/login", replace: true });
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "Gagal verifikasi kode OTP.");
    }
  }

  async function resend() {
    try {
      const res = await requestOtpServerFn({ data: { email } });
      if (!res.success) {
        return void toast.error(res.message || "Gagal mengirim ulang kode OTP.");
      }
      sessionStorage.setItem("otp_sent_at", String(Date.now()));
      setAttempts(0);
      setLeft(COOLDOWN);
      toast.success("Kode baru telah dikirim");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim ulang. Coba beberapa saat lagi.");
    }
  }

  const locked = attempts >= MAX_ATTEMPTS;

  return (
    <AuthShell>
      <Link to="/login" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Ganti email
      </Link>
      <h1 className="text-xl font-bold">Verifikasi kode OTP</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kode dikirim ke <span className="font-semibold text-foreground">{email}</span>. Berlaku 10 menit, sekali pakai.
      </p>
      <div className="my-6 flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={() => {}} disabled={locked}>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button className="h-11 w-full text-base font-semibold" onClick={verify} disabled={loading || locked}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Verifikasi & Login
      </Button>
      {locked && <p className="mt-3 text-center text-sm text-destructive">Batas percobaan tercapai. Kirim ulang kode.</p>}
      <div className="mt-5 text-center text-sm">
        {left > 0 ? (
          <span className="text-muted-foreground">Kirim ulang dalam {left} detik</span>
        ) : (
          <button onClick={resend} className="font-semibold text-primary hover:underline">
            Kirim ulang kode
          </button>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Atau klik tombol <b>Login ke SIAKAD PONPES</b> di email Anda.
      </p>
    </AuthShell>
  );
}
