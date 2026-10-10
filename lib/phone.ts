/**
 * Normalises an Indian mobile number to a plain 10-digit string.
 * Trims whitespace, strips separators, and removes a leading "+91",
 * "91" (when 12 digits) or "0" (when 11 digits).
 */
export function normalizePhone(value: unknown): string {
  let p = String(value ?? "").trim().replace(/[\s\-()]/g, "");
  if (p.startsWith("+91")) p = p.slice(3);
  else if (p.length === 12 && p.startsWith("91")) p = p.slice(2);
  else if (p.length === 11 && p.startsWith("0")) p = p.slice(1);
  return p.replace(/\D/g, "");
}

export function isValidIndianMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}
