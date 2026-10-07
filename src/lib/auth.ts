import { getAuthStateServerFn, signOutServerFn } from "./auth-server";

export type Role = "admin" | "user";

const SESSION_KEY = "siakad_session_token";

export function getLocalSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
}

export function setLocalSessionToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, token);
  }
}

export function clearLocalSessionToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export async function getAuthState(): Promise<{ userId: string; email: string; role: Role } | null> {
  const token = getLocalSessionToken();
  if (!token) return null;
  try {
    const auth = await getAuthStateServerFn({ data: { sessionToken: token } });
    if (!auth) {
      clearLocalSessionToken();
      return null;
    }
    return auth;
  } catch (err) {
    return null;
  }
}

export function homeFor(role: Role) {
  return role === "admin" ? "/admin/dashboard" : "/dashboard";
}

export async function signOut() {
  const token = getLocalSessionToken();
  if (token) {
    try {
      await signOutServerFn({ data: { sessionToken: token } });
    } catch {}
  }
  clearLocalSessionToken();
}

export const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

export const tanggal = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
