/**
 * Parse emails from text input (handles multiple formats)
 * Supports: comma-separated, line-separated, space-separated, or mixed
 */
export function parseEmails(text: string): {
  emails: string[];
  invalid: string[];
  duplicates: string[];
} {
  if (!text || !text.trim()) {
    return { emails: [], invalid: [], duplicates: [] };
  }

  // Split by common delimiters and flatten
  const rawEmails = text
    .split(/[\n,\s]+/)
    .map(email => email.trim())
    .filter(email => email.length > 0);

  // Validate and deduplicate
  const validEmails: string[] = [];
  const invalidEmails: string[] = [];
  const seenEmails = new Set<string>();
  const duplicates: string[] = [];

  for (const email of rawEmails) {
    const normalizedEmail = email.toLowerCase();
    
    if (!isValidEmail(email)) {
      invalidEmails.push(email);
      continue;
    }

    if (seenEmails.has(normalizedEmail)) {
      duplicates.push(email);
      continue;
    }

    seenEmails.add(normalizedEmail);
    validEmails.push(email);
  }

  return {
    emails: validEmails,
    invalid: invalidEmails,
    duplicates: duplicates,
  };
}

/**
 * Validate email format using regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Deduplicate emails (case-insensitive)
 */
export function deduplicateEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const email of emails) {
    const normalized = email.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(email);
    }
  }

  return result;
}

