import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/payments")({
  beforeLoad: () => {
    throw redirect({ to: "/payments" });
  },
});
