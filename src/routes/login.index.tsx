import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { getAuthState, homeFor } from "@/lib/auth";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/AuthShell";

export const Route = createFileRoute("/login/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Masuk — SIAKAD PONPES" },
      { name: "description", content: "Masuk ke SIAKAD PONPES dengan kode OTP atau magic link email." },
      { property: "og:title", content: "Masuk — SIAKAD PONPES" },
      { property: "og:description", content: "Masuk ke SIAKAD PONPES dengan kode OTP atau magic link email." },
    ],
  }),
  beforeLoad: async () => {
    const s = await getAuthState();
    if (s) throw redirect({ to: homeFor(s.role) });
  },
  component: LoginPage,
});

import { requestOtpServerFn } from "@/lib/auth-server";

const emailSchema = z.string().trim().email("Alamat email tidak valid").max(255);

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message);
    setLoading(true);
    try {
      const res = await requestOtpServerFn({ data: { email: parsed.data } });
      setLoading(false);
      if (!res.success) {
        return void toast.error(res.message || "Gagal mengirim kode. Coba lagi.");
      }
      toast.success(res.message);
      sessionStorage.setItem("otp_sent_at", String(Date.now()));
      navigate({ to: "/login/verify", search: { email: parsed.data } });
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "Terjadi kesalahan saat mengirim kode OTP.");
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="Masukkan alamat email"
              className="h-11 pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Kirim Kode OTP
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">Kode OTP akan dikirim ke email Anda.</p>
    </AuthShell>
  );
}
