export function normalizePhoneQuery(input: string): string {
  if (!input) return '';
  const digits = input.replace(/\D/g, '');
  if (digits.length >= 11 && (digits.startsWith('88') || digits.startsWith('91') || digits.startsWith('1'))) {
    if (digits.length >= 12 && digits.startsWith('88')) return digits.slice(2);
    if (digits.length >= 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  }
  return digits;
}

export function looksLikePhone(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  if (!trimmed) return false;
  const digitCount = (trimmed.match(/\d/g) || []).length;
  if (digitCount < 4) return false;
  return /^[\d\s+\-()]+$/.test(trimmed);
}
