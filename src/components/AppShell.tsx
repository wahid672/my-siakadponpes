import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LogOut,
  LayoutDashboard,
  FileText,
  Users,
  PlusCircle,
  CreditCard,
  Layers,
  SlidersHorizontal,
  BarChart3,
  History,
  Settings,
  User,
  Menu,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Brand } from "./Brand";
import { signOut, type Role } from "@/lib/auth";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppShell({ role, email, children }: { role: Role; email: string; children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const routerState = useRouterState();
  const pathname = routerState?.location?.pathname || "";

  const nav =
    role === "admin"
      ? [
          { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/admin/users", label: "Pengguna", icon: Users },
          { to: "/admin/invoices", label: "Invoice", icon: FileText },
          { to: "/admin/invoices/new", label: "Buat Invoice", icon: PlusCircle },
          { to: "/admin/payments", label: "Pembayaran", icon: CreditCard },
          { to: "/admin/payment-channels", label: "Saluran Bayar", icon: Layers },
          { to: "/admin/payment-gateway", label: "Payment Gateway", icon: SlidersHorizontal },
          { to: "/admin/reports", label: "Laporan", icon: BarChart3 },
          { to: "/admin/audit-logs", label: "Log Audit", icon: History },
          { to: "/admin/settings", label: "Pengaturan", icon: Settings },
        ]
      : [
          { to: "/dashboard", label: "Tagihan Saya", icon: FileText },
          { to: "/payments", label: "Riwayat Bayar", icon: CreditCard },
          { to: "/profile", label: "Profil Saya", icon: User },
        ];

  const currentNav =
    nav.find((n) => {
      if (n.to === "/admin/dashboard" || n.to === "/dashboard") {
        return pathname === n.to;
      }
      return pathname.startsWith(n.to);
    }) ||
    (pathname.includes("/invoice/") ? { label: "Detail Invoice" } : null) ||
    nav[0];

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* 1. Mobile Header with Top-Right Breadcrumb Menu */}
      <header className="no-print flex md:hidden items-center justify-between px-3.5 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border/60 sticky top-0 z-40 shadow-2xs">
        <Brand size="sm" light />

        {/* Breadcrumb Navigation on the Top-Right */}
        <Breadcrumb>
          <BreadcrumbList className="text-xs text-sidebar-foreground/80 flex items-center gap-1 sm:gap-1.5">
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg bg-sidebar-accent/80 hover:bg-sidebar-accent px-2.5 py-1 text-xs font-semibold text-sidebar-primary border border-sidebar-border/70 transition outline-none shadow-2xs">
                  <Menu className="h-3.5 w-3.5 shrink-0" />
                  <span>Menu</span>
                  <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border bg-card text-card-foreground">
                  <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Menu Navigasi {role === "admin" ? "Admin" : "Klien"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-[60vh] overflow-y-auto space-y-0.5">
                    {nav.map((n) => {
                      const isActive =
                        pathname === n.to ||
                        (n.to !== "/admin/dashboard" && n.to !== "/dashboard" && pathname.startsWith(n.to));
                      return (
                        <DropdownMenuItem key={n.to} asChild>
                          <Link
                            to={n.to}
                            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium cursor-pointer transition ${
                              isActive ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                            }`}
                          >
                            <n.icon
                              className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                            />
                            <span>{n.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="px-2.5 py-1 text-[11px] text-muted-foreground truncate">
                    {email}
                  </div>
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive focus:text-destructive flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0" />
                    <span>Keluar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>

            <BreadcrumbSeparator className="text-sidebar-foreground/40">
              <ChevronRight className="h-3 w-3" />
            </BreadcrumbSeparator>

            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-xs text-sidebar-primary truncate max-w-[105px] sm:max-w-[150px]">
                {currentNav?.label || "Halaman"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* 2. Desktop Sidebar (Hidden on Mobile) */}
      <aside className="no-print hidden md:flex md:sticky md:top-0 md:h-screen md:w-64 md:flex-col md:border-r md:border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border/40">
          <Brand size="sm" light />
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent !text-sidebar-primary font-semibold shadow-xs" }}
            >
              <n.icon className="h-4 w-4 shrink-0" />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center font-bold text-xs uppercase text-sidebar-primary">
              {(email || "U")[0]}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{email}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-primary">{role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="no-print mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  subtext,
  tone = "default",
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: "default" | "gold" | "green" | "red" | "amber";
}) {
  const bar = {
    default: "bg-primary",
    gold: "bg-amber-400",
    green: "bg-emerald-500",
    red: "bg-rose-500",
    amber: "bg-amber-500",
  }[tone];

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 sm:p-5 shadow-xs transition hover:shadow-sm min-w-0 flex flex-col justify-between">
      <div className={`absolute inset-x-0 top-0 h-1 ${bar}`} />
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate" title={label}>
        {label}
      </p>
      <div className="mt-2 min-w-0">
        <p
          className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight text-card-foreground truncate leading-tight"
          title={value}
        >
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground truncate" title={subtext}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
