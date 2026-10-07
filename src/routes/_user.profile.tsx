import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, Building, MapPin, Mail, Save } from "lucide-react";
import { getUserProfileServerFn, updateUserProfileServerFn } from "@/lib/data-server";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChangePasswordCard } from "@/components/ChangePasswordCard";

export const Route = createFileRoute("/_user/profile")({
  head: () => ({
    meta: [
      { title: "Profil Pengguna — SIAKAD PONPES" },
      { name: "description", content: "Kelola informasi data akun dan lembaga Anda." },
      { property: "og:title", content: "Profil Pengguna — SIAKAD PONPES" },
      { property: "og:description", content: "Kelola informasi data akun dan lembaga Anda." },
    ],
  }),
  component: UserProfilePage,
});

function UserProfilePage() {
  const { auth } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", auth.userId],
    queryFn: async () => {
      return await getUserProfileServerFn({ data: auth.userId });
    },
  });

  const [form, setForm] = useState({
    full_name: "",
    organization: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        organization: profile.organization ?? "",
        address: profile.address ?? "",
      });
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateUserProfileServerFn({
        data: {
          userId: auth.userId,
          profile: {
            full_name: form.full_name.slice(0, 100) || null,
            organization: form.organization.slice(0, 150) || null,
            address: form.address.slice(0, 500) || null,
          },
        },
      });
      setSaving(false);
      if (!res.success) return toast.error(res.message);
      toast.success("Profil Anda berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err: any) {
      setSaving(false);
      toast.error(err.message || "Gagal memperbarui profil");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Profil Saya"
        sub="Informasi ini dicetak sebagai rincian penerima tagihan pada setiap invoice Anda."
      />

      <form onSubmit={handleSave} className="space-y-6 rounded-2xl border bg-card p-6 md:p-8 shadow-xs">
        <div className="space-y-2">
          <Label>Alamat Email</Label>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-mono">{auth.email}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Alamat email digunakan untuk menerima kode OTP & tagihan resmi.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Nama Lengkap / Kontak PIC</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Contoh: Ustadz Ahmad Fauzi"
          />
        </div>

        <div className="space-y-2">
          <Label>Lembaga / Pondok Pesantren</Label>
          <Input
            value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })}
            placeholder="Contoh: Pondok Pesantren Mutiara Quran"
          />
        </div>

        <div className="space-y-2">
          <Label>Alamat Lengkap Penagihan</Label>
          <Textarea
            rows={3}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Alamat domisili atau alamat pondok pesantren..."
          />
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan Profil"}
          </Button>
        </div>
      </form>

      {/* Ganti Kata Sandi */}
      <ChangePasswordCard />
    </div>
  );
}
