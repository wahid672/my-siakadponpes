import type { ReactNode } from "react";
import { Brand } from "./Brand";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-brand opacity-10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Brand size="lg" />
          <p className="mt-3 text-sm text-muted-foreground">Sistem Informasi Akademik Pondok Pesantren</p>
        </div>
        <div className="rounded-2xl border bg-card p-7 shadow-card sm:p-8">{children}</div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SIAKAD PONPES · <span className="text-accent-foreground">Invoice & Payment</span>
        </p>
      </div>
    </main>
  );
}
