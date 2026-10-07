import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getAuthState, homeFor } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({ meta: [{ title: "Memproses login — SIAKAD PONPES" }, { name: "robots", content: "noindex" }] }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  useEffect(() => {
    let done = false;
    const go = async () => {
      if (done) return;
      const s = await getAuthState();
      if (s) {
        done = true;
        navigate({ to: homeFor(s.role), replace: true });
      } else {
        navigate({ to: "/login", replace: true });
      }
    };
    void go();
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Memproses login…
    </div>
  );
}
