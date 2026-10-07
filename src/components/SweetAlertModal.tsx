import { AlertTriangle, UserPlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SweetAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onRegisterClick: () => void;
}

export function SweetAlertModal({
  open,
  onOpenChange,
  email,
  onRegisterClick,
}: SweetAlertModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 text-center sm:text-center">
        {/* SweetAlert Style Warning Icon */}
        <div className="mx-auto my-2 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-8 ring-amber-50">
          <AlertTriangle className="h-8 w-8 animate-pulse text-amber-600" />
        </div>

        <DialogHeader className="space-y-2 text-center">
          <DialogTitle className="text-xl font-bold text-foreground">
            Email Belum Terdaftar
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Alamat email <strong className="font-semibold text-foreground underline">{email}</strong> belum terdaftar dalam sistem SIAKAD PONPES.
            <br />
            Silakan periksa kembali email Anda atau lakukan pendaftaran akun baru.
          </DialogDescription>
        </DialogHeader>

        {/* 2 Action Buttons: Close & Daftar Akun */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="mr-1.5 h-4 w-4" />
            Tutup
          </Button>

          <Button
            type="button"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {
              onOpenChange(false);
              onRegisterClick();
            }}
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Daftar Akun
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
