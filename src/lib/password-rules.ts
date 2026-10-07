/**
 * Password validation rules compliant with security standards:
 * - Minimal 8 karakter
 * - Memiliki minimal 1 huruf besar (Uppercase)
 * - Memiliki minimal 1 angka (Number)
 * - Memiliki minimal 1 karakter khusus / simbol (Special character)
 */

export interface PasswordCheckResult {
  valid: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  minLength: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordCheckResult {
  const p = password || "";
  const minLength = p.length >= 8;
  const hasUpper = /[A-Z]/.test(p);
  const hasNumber = /[0-9]/.test(p);
  const hasSpecial = /[^A-Za-z0-9]/.test(p);

  const errors: string[] = [];
  if (!minLength) errors.push("Minimal 8 karakter");
  if (!hasUpper) errors.push("Minimal 1 huruf besar (A-Z)");
  if (!hasNumber) errors.push("Minimal 1 angka (0-9)");
  if (!hasSpecial) errors.push("Minimal 1 karakter khusus / simbol (!@#$% dll)");

  return {
    valid: minLength && hasUpper && hasNumber && hasSpecial,
    hasUpper,
    hasNumber,
    hasSpecial,
    minLength,
    errors,
  };
}
