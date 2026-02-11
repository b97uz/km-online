export function normalizeUzPhone(raw: string): string {
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  if (!cleaned) return "";

  const withPlus = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
  return withPlus;
}

export function phoneVariants(raw: string): string[] {
  const normalized = normalizeUzPhone(raw);
  if (!normalized) return [];
  const withoutPlus = normalized.replace(/^\+/, "");
  return Array.from(new Set([normalized, withoutPlus]));
}

export function isUzE164(phone: string): boolean {
  return /^\+998\d{9}$/.test(phone);
}
