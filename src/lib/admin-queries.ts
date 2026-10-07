import { useQuery } from "@tanstack/react-query";
import {
  getAdminInvoicesServerFn,
  getProfilesServerFn,
  getAdminPaymentsServerFn,
} from "./data-server";

export function useAdminInvoices() {
  return useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      return await getAdminInvoicesServerFn();
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      return await getProfilesServerFn();
    },
  });
}

export function useAdminPayments() {
  return useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      return await getAdminPaymentsServerFn();
    },
  });
}
