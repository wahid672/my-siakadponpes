import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthState } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_user")({
  ssr: false,
  beforeLoad: async () => {
    const auth = await getAuthState();
    if (!auth) throw redirect({ to: "/login" });
    return { auth };
  },
  component: () => {
    const { auth } = Route.useRouteContext();
    return (
      <AppShell role={auth.role} email={auth.email}>
        <Outlet />
      </AppShell>
    );
  },
});
