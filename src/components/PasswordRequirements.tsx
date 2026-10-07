import { Check, X } from "lucide-react";
import { validatePassword } from "@/lib/password-rules";

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const result = validatePassword(password);

  const items = [
    { label: "Minimal 8 karakter", met: result.minLength },
    { label: "Minimal 1 huruf besar (A-Z)", met: result.hasUpper },
    { label: "Minimal 1 angka (0-9)", met: result.hasNumber },
    { label: "Minimal 1 karakter khusus / simbol (@, #, $, dll)", met: result.hasSpecial },
  ];

  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
      <p className="font-semibold text-muted-foreground">Syarat Kata Sandi:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 transition-colors ${
              item.met ? "text-emerald-600 font-medium" : "text-muted-foreground"
            }`}
          >
            {item.met ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mx-1 shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
