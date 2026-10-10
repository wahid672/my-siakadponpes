import { createServerFn } from "@tanstack/react-start";
import crypto from "crypto";
import { sqlite } from "./db";
import { cleanInvoiceNotes, extractActivePayment } from "./public-invoice";

export const getAdminInvoicesServerFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const invoices = sqlite.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all() as any[];
    const profiles = sqlite.prepare("SELECT * FROM profiles").all() as any[];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    return invoices.map((inv) => {
      const p = profileMap.get(inv.user_id);
      let items = [];
      try {
        items = typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items || [];
      } catch {
        items = [];
      }

      return {
        ...inv,
        items,
        notes: cleanInvoiceNotes(inv.notes),
        customer: p?.organization || p?.full_name || p?.email || "Pelanggan",
        customer_email: p?.email,
        customer_org: p?.organization,
        customer_phone: p?.phone,
        customer_pic: p?.pic,
        customer_address: p?.address,
      };
    });
  } catch (err) {
    console.error("[getAdminInvoicesServerFn Error]:", err);
    return [];
  }
});

export const getProfilesServerFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const profiles = sqlite.prepare("SELECT * FROM profiles ORDER BY created_at DESC").all() as any[];
    const users = sqlite.prepare("SELECT id, role FROM users").all() as any[];
    const roleMap = new Map(users.map((u) => [u.id, u.role]));

    return profiles.map((p) => ({
      ...p,
      role: roleMap.get(p.id) || "user",
    }));
  } catch (err) {
    console.error("[getProfilesServerFn Error]:", err);
    return [];
  }
});

export const getAdminPaymentsServerFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const payments = sqlite.prepare("SELECT * FROM payments ORDER BY paid_at DESC").all() as any[];
    const invoices = sqlite.prepare("SELECT id, invoice_number, total, status FROM invoices").all() as any[];
    const profiles = sqlite.prepare("SELECT id, full_name, email, organization FROM profiles").all() as any[];

    const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    return payments.map((pm) => {
      const inv = invoiceMap.get(pm.invoice_id);
      const usr = profileMap.get(pm.user_id);
      return {
        ...pm,
        invoice_number: inv?.invoice_number ?? "-",
        customer_name: usr?.organization || usr?.full_name || usr?.email || "Pelanggan",
        customer_email: usr?.email,
        status: pm.status || "paid",
      };
    });
  } catch (err) {
    console.error("[getAdminPaymentsServerFn Error]:", err);
    return [];
  }
});

export const getUserInvoicesServerFn = createServerFn({ method: "GET" })
  .validator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    try {
      const invoices = sqlite
        .prepare("SELECT * FROM invoices WHERE user_id = ? ORDER BY issue_date DESC")
        .all(userId) as any[];

      return invoices.map((inv) => {
        let items = [];
        try {
          items = typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items || [];
        } catch {
          items = [];
        }
        return {
          ...inv,
          items,
          notes: cleanInvoiceNotes(inv.notes),
        };
      });
    } catch (err) {
      console.error("[getUserInvoicesServerFn Error]:", err);
      return [];
    }
  });

export const getUserPaymentsServerFn = createServerFn({ method: "GET" })
  .validator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    try {
      const payments = sqlite
        .prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY paid_at DESC")
        .all(userId) as any[];

      const invoices = sqlite.prepare("SELECT id, invoice_number FROM invoices WHERE user_id = ?").all(userId) as any[];
      const invoiceMap = new Map(invoices.map((i) => [i.id, i.invoice_number]));

      return payments.map((p) => ({
        ...p,
        invoice_number: invoiceMap.get(p.invoice_id) || "-",
      }));
    } catch (err) {
      console.error("[getUserPaymentsServerFn Error]:", err);
      return [];
    }
  });

export const getUserProfileServerFn = createServerFn({ method: "GET" })
  .validator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    try {
      const profile = sqlite.prepare("SELECT * FROM profiles WHERE id = ?").get(userId) as any;
      const user = sqlite.prepare("SELECT role FROM users WHERE id = ?").get(userId) as any;
      if (!profile) return null;
      return {
        ...profile,
        role: user?.role || "user",
      };
    } catch (err) {
      console.error("[getUserProfileServerFn Error]:", err);
      return null;
    }
  });

export const updateUserProfileServerFn = createServerFn({ method: "POST" })
  .validator((params: { userId: string; profile: any }) => params)
  .handler(async ({ data: { userId, profile } }) => {
    try {
      sqlite
        .prepare(
          `UPDATE profiles SET 
            full_name = ?, organization = ?, phone = ?, pic = ?, address = ?
           WHERE id = ?`
        )
        .run(
          profile.full_name || null,
          profile.organization || null,
          profile.phone || null,
          profile.pic || null,
          profile.address || null,
          userId
        );
      return { success: true, message: "Profil berhasil diperbarui" };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal memperbarui profil" };
    }
  });

export const createInvoiceServerFn = createServerFn({ method: "POST" })
  .validator((invoiceData: any) => invoiceData)
  .handler(async ({ data: inv }) => {
    try {
      const id = inv.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const itemsStr = typeof inv.items === "string" ? inv.items : JSON.stringify(inv.items || []);

      sqlite
        .prepare(
          `INSERT INTO invoices (
            id, invoice_number, user_id, issue_date, due_date, status,
            items, tax_rate, discount, subtotal, total, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          inv.invoice_number,
          inv.user_id,
          inv.issue_date,
          inv.due_date,
          inv.status || "unpaid",
          itemsStr,
          inv.tax_rate || 0,
          inv.discount || 0,
          inv.subtotal || 0,
          inv.total || 0,
          inv.notes || "",
          now
        );

      return { success: true, invoiceId: id, message: "Invoice berhasil dibuat" };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal membuat invoice" };
    }
  });

export const updateInvoiceStatusServerFn = createServerFn({ method: "POST" })
  .validator((params: { id: string; status: string; paidAt?: string; notes?: string }) => params)
  .handler(async ({ data: { id, status, paidAt, notes } }) => {
    try {
      if (status === "paid") {
        sqlite
          .prepare("UPDATE invoices SET status = ?, paid_at = ?, notes = COALESCE(?, notes) WHERE id = ?")
          .run(status, paidAt || new Date().toISOString(), notes, id);
      } else {
        sqlite
          .prepare("UPDATE invoices SET status = ?, notes = COALESCE(?, notes) WHERE id = ?")
          .run(status, notes, id);
      }
      return { success: true, message: "Status invoice berhasil diperbarui" };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal memperbarui invoice" };
    }
  });

export const updateInvoiceItemsServerFn = createServerFn({ method: "POST" })
  .validator(
    (params: {
      id: string;
      items: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
      tax_rate: number;
      discount: number;
      subtotal: number;
      total: number;
      notes?: string;
    }) => params
  )
  .handler(async ({ data }) => {
    try {
      const existing = sqlite.prepare("SELECT status FROM invoices WHERE id = ?").get(data.id) as any;
      if (!existing) return { success: false, message: "Invoice tidak ditemukan" };
      if (existing.status !== "unpaid") {
        return { success: false, message: "Hanya invoice berstatus Belum Bayar yang dapat diedit." };
      }

      const itemsStr = JSON.stringify(data.items || []);
      sqlite
        .prepare(
          `UPDATE invoices 
           SET items = ?,
               tax_rate = ?,
               discount = ?,
               subtotal = ?,
               total = ?,
               notes = COALESCE(?, notes)
           WHERE id = ?`
        )
        .run(
          itemsStr,
          data.tax_rate ?? 0,
          data.discount ?? 0,
          data.subtotal,
          data.total,
          data.notes ?? null,
          data.id
        );

      return { success: true, message: "Rincian invoice berhasil diperbarui" };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal memperbarui rincian invoice" };
    }
  });

export const deleteInvoiceServerFn = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const existing = sqlite.prepare("SELECT id, invoice_number, status FROM invoices WHERE id = ?").get(id) as any;
      if (!existing) return { success: false, message: "Invoice tidak ditemukan" };

      // Hapus riwayat pembayaran terkait invoice (jika ada) untuk menjaga integritas data
      sqlite.prepare("DELETE FROM payments WHERE invoice_id = ?").run(id);
      // Hapus record invoice
      sqlite.prepare("DELETE FROM invoices WHERE id = ?").run(id);

      return { success: true, message: `Invoice #${existing.invoice_number} berhasil dihapus` };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal menghapus invoice" };
    }
  });

export const createUserProfileServerFn = createServerFn({ method: "POST" })
  .validator((userData: any) => userData)
  .handler(async ({ data: u }) => {
    try {
      const email = u.email.trim().toLowerCase();
      const existing = sqlite.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (existing) {
        return { success: false, message: "Email sudah terdaftar" };
      }

      const id = "usr-" + crypto.randomUUID();
      const now = new Date().toISOString();

      sqlite
        .prepare("INSERT INTO users (id, email, role, created_at) VALUES (?, ?, ?, ?)")
        .run(id, email, u.role || "user", now);

      sqlite
        .prepare(
          `INSERT INTO profiles (id, email, full_name, organization, phone, pic, address, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          email,
          u.full_name || null,
          u.organization || null,
          u.phone || null,
          u.pic || null,
          u.address || null,
          now
        );

      return { success: true, userId: id, message: "Pengguna berhasil ditambahkan" };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal menambahkan pengguna" };
    }
  });

export const updateUserRoleServerFn = createServerFn({ method: "POST" })
  .validator((params: { userId: string; role: string }) => params)
  .handler(async ({ data: { userId, role } }) => {
    try {
      sqlite.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
      return { success: true, message: "Peran pengguna berhasil diubah" };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal mengubah peran" };
    }
  });

export const markInvoicePaidServerFn = createServerFn({ method: "POST" })
  .validator((params: { id: string; total: number; userId: string; paidAt?: string; method?: string }) => params)
  .handler(async ({ data: { id, total, userId, paidAt, method } }) => {
    try {
      const paidTimestamp = paidAt ? new Date(paidAt).toISOString() : new Date().toISOString();
      sqlite
        .prepare("UPDATE invoices SET status = 'paid', paid_at = ? WHERE id = ?")
        .run(paidTimestamp, id);

      const payId = "pay-" + crypto.randomUUID();
      sqlite
        .prepare(
          "INSERT INTO payments (id, invoice_id, user_id, amount, method, status, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(payId, id, userId, total, method || "Transfer Bank Manual", "paid", paidTimestamp, paidTimestamp);

      return { success: true, message: "Invoice berhasil ditandai lunas" };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal memperbarui status" };
    }
  });

export const duplicateInvoiceServerFn = createServerFn({ method: "POST" })
  .validator((inv: any) => inv)
  .handler(async ({ data: inv }) => {
    try {
      const d = new Date();
      const newNumber = `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
        d.getDate()
      ).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`;
      const id = "inv-" + crypto.randomUUID();
      const now = new Date().toISOString();

      const itemsStr = typeof inv.items === "string" ? inv.items : JSON.stringify(inv.items || []);

      sqlite
        .prepare(
          `INSERT INTO invoices (
            id, user_id, invoice_number, issue_date, due_date,
            items, subtotal, tax_rate, discount, total, notes, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?)`
        )
        .run(
          id,
          inv.user_id,
          newNumber,
          now.slice(0, 10),
          now.slice(0, 10),
          itemsStr,
          inv.subtotal || 0,
          inv.tax_rate || 0,
          inv.discount || 0,
          inv.total || 0,
          inv.notes || null,
          now
        );

      return { success: true, newNumber, message: `Invoice diduplikasi dengan nomor baru: ${newNumber}` };
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal menduplikasi invoice" };
    }
  });

