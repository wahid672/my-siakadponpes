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
        <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <a
            href="https://siakadponpes.com/"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            ← Kembali ke Website Utama siakadponpes.com
          </a>
          <p>© {new Date().getFullYear()} SIAKAD PONPES · Invoice & Layanan Klien Lembaga</p>
        </div>
      </div>
    </main>
  );
}
