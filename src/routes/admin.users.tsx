import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  Building,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  Edit2,
  Shield,
} from "lucide-react";
import { createUserProfileServerFn, updateUserProfileServerFn } from "@/lib/data-server";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useProfiles } from "@/lib/admin-queries";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Manajemen Pengguna — SIAKAD PONPES" },
      { name: "description", content: "Kelola data klien, PIC lembaga, dan akun penerima invoice." },
      { property: "og:title", content: "Manajemen Pengguna — SIAKAD PONPES" },
      { property: "og:description", content: "Kelola data klien, PIC lembaga, dan akun penerima invoice." },
    ],
  }),
  component: UsersManagement,
});

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  phone?: string | null;
  pic?: string | null;
  address: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  role: string;
};

function UsersManagement() {
  const { data = [], isLoading } = useProfiles();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New User Form State
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    organization: "",
    phone: "",
    pic: "",
    address: "",
    role: "user",
  });
  const [savingAdd, setSavingAdd] = useState(false);

  const filtered = data.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.organization ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.email) return toast.error("Email wajib diisi");
    setSavingAdd(true);

    try {
      const res = await createUserProfileServerFn({ data: newUser });
      if (!res.success) {
        toast.error(res.message);
        setSavingAdd(false);
        return;
      }

      toast.success(res.message);
      setIsAddOpen(false);
      setNewUser({ email: "", full_name: "", organization: "", phone: "", pic: "", address: "", role: "user" });
      qc.invalidateQueries({ queryKey: ["profiles"] });
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setSavingAdd(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pengguna"
        sub="Kelola akun klien, penanggung jawab (PIC), dan lembaga mitra."
        action={
          <Button onClick={() => setIsAddOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Tambah Pengguna
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama, email, atau lembaga..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["all", "admin", "user"].map((r) => (
            <Button
              key={r}
              size="sm"
              variant={roleFilter === r ? "default" : "outline"}
              onClick={() => setRoleFilter(r)}
            >
              {{ all: "Semua", admin: "Administrator", user: "Klien / Lembaga" }[r]}
            </Button>
          ))}
        </div>
      </div>

      {/* User Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Memuat data pengguna...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Tidak ada pengguna yang cocok dengan kriteria pencarian.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition hover:shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate text-foreground">{u.full_name || "Tanpa Nama"}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3 shrink-0" /> {u.email}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      u.role === "admin"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {u.role}
                  </span>
                </div>

                <div className="space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{u.organization || "Lembaga / Klien"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{u.address || "Belum ada alamat"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end border-t pt-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(u as UserProfile);
                    setIsDialogOpen(true);
                  }}
                >
                  <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit Data
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog Edit User */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profil Pengguna</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <EditUserForm
              user={selectedUser}
              onClose={() => setIsDialogOpen(false)}
              onSuccess={() => {
                setIsDialogOpen(false);
                qc.invalidateQueries({ queryKey: ["profiles"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Add User */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Alamat Email *</Label>
              <Input
                type="email"
                required
                placeholder="nama@email.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap / Kontak</Label>
              <Input
                placeholder="Nama lengkap PIC atau penanggung jawab"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Lembaga / Pondok Pesantren</Label>
              <Input
                placeholder="Contoh: PP Al-Hikmah"
                value={newUser.organization}
                onChange={(e) => setNewUser({ ...newUser, organization: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat Lengkap</Label>
              <Textarea
                placeholder="Alamat penagihan..."
                value={newUser.address}
                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role Akses</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="user">User (Klien / Mitra Lembaga)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={savingAdd}>
                {savingAdd ? "Menyimpan..." : "Simpan Pengguna"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditUserForm({
  user,
  onClose,
  onSuccess,
}: {
  user: UserProfile;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    full_name: user.full_name ?? "",
    organization: user.organization ?? "",
    address: user.address ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateUserProfileServerFn({
        data: {
          userId: user.id,
          profile: {
            full_name: form.full_name.slice(0, 100) || null,
            organization: form.organization.slice(0, 150) || null,
            address: form.address.slice(0, 500) || null,
          },
        },
      });
      setSaving(false);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Profil berhasil diperbarui");
      onSuccess();
    } catch (err: any) {
      setSaving(false);
      toast.error(err.message || "Gagal memperbarui profil");
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">Email Pengguna:</p>
        <p className="font-semibold text-sm">{user.email}</p>
      </div>
      <div className="space-y-2">
        <Label>Nama Lengkap (ATTN / PIC)</Label>
        <Input
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          placeholder="Nama lengkap PIC penanggung jawab"
        />
      </div>
      <div className="space-y-2">
        <Label>Lembaga / Pondok Pesantren</Label>
        <Input
          value={form.organization}
          onChange={(e) => setForm({ ...form, organization: e.target.value })}
          placeholder="Nama pesantren atau instansi"
        />
      </div>
      <div className="space-y-2">
        <Label>Alamat Penagihan</Label>
        <Textarea
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Alamat lengkap lembaga"
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
