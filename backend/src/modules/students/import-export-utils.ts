/**
 * Utility functions for import/export operations.
 * Handles mapping normalization, field extraction, and data parsing.
 */

import { AVAILABLE_FIELDS, getRequiredFields } from './import-export-fields';

/**
 * Old mapping format (backward compatible)
 */
export interface OldMappingFormat {
  name?: string;
  email?: string;
  phone?: string;
  tags?: string;
  discordId?: string;
}

/**
 * New flexible mapping format
 */
export interface FlexibleMappingFormat {
  [fieldPath: string]: string; // fieldPath -> CSV column name
}

/**
 * Normalized mapping (always in new format)
 */
export interface NormalizedMapping {
  student: {
    name?: string;
    email?: string;
    discordId?: string;
    tags?: string;
  };
  phones: Array<{ column: string; index?: number; name?: string }>;
  enrollment: {
    groupName?: string;
    courseName?: string;
    status?: string;
  };
}

/**
 * Convert old mapping format to new format
 */
export function normalizeMapping(
  mapping: OldMappingFormat | FlexibleMappingFormat
): NormalizedMapping {
  const normalized: NormalizedMapping = {
    student: {},
    phones: [],
    enrollment: {},
  };

  // Check if it's old format (has direct name/email/phone/tags keys)
  const isOldFormat =
    'name' in mapping ||
    'email' in mapping ||
    'phone' in mapping ||
    'tags' in mapping;

  if (isOldFormat) {
    // Old format: { name: "Full Name", email: "Email", ... }
    const oldMapping = mapping as OldMappingFormat;
    if (oldMapping.name) normalized.student.name = oldMapping.name;
    if (oldMapping.email) normalized.student.email = oldMapping.email;
    if (oldMapping.discordId) (normalized.student as any).discordId = oldMapping.discordId;
    if (oldMapping.tags) normalized.student.tags = oldMapping.tags;
    if (oldMapping.phone) {
      normalized.phones.push({ column: oldMapping.phone, index: 0 });
    }
  } else {
    // New format: { "student.name": "Full Name", "phone.0": "Phone", ... }
    const flexibleMapping = mapping as FlexibleMappingFormat;

    for (const [fieldPath, columnName] of Object.entries(flexibleMapping)) {
      if (fieldPath.startsWith('student.')) {
        const field = fieldPath.replace('student.', '');
        if (field === 'name' || field === 'email' || field === 'tags' || field === 'discordId') {
          (normalized.student as any)[field] = columnName;
        }
      } else if (fieldPath.startsWith('phone.')) {
        const phoneKey = fieldPath.replace('phone.', '');
        const phoneIndex = parseInt(phoneKey, 10);
        if (!isNaN(phoneIndex)) {
          // Indexed: phone.0, phone.1, etc.
          normalized.phones.push({ column: columnName, index: phoneIndex });
        } else {
          // Named: phone.primary, phone.alternate, etc.
          normalized.phones.push({ column: columnName, name: phoneKey });
        }
      } else if (fieldPath.startsWith('enrollment.')) {
        const field = fieldPath.replace('enrollment.', '');
        if (field === 'groupName' || field === 'courseName' || field === 'status') {
          (normalized.enrollment as any)[field] = columnName;
        }
      }
    }

    // Sort phones by index (if indexed) to maintain order
    normalized.phones.sort((a, b) => {
      if (a.index !== undefined && b.index !== undefined) {
        return a.index - b.index;
      }
      if (a.index !== undefined) return -1;
      if (b.index !== undefined) return 1;
      return 0;
    });
  }

  return normalized;
}

/**
 * Extract field value from CSV row using normalized mapping
 */
export function extractFieldValue(
  row: Record<string, any>,
  columnName: string
): string {
  if (!columnName) return '';
  const value = row[columnName];
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Parse student data from CSV row using normalized mapping
 */
export function parseStudentFromMapping(
  row: Record<string, any>,
  mapping: NormalizedMapping
): {
  name: string;
  email?: string;
  discordId?: string;
  tags: string[];
} {
  const name = mapping.student.name
    ? extractFieldValue(row, mapping.student.name)
    : '';
  const email = mapping.student.email
    ? extractFieldValue(row, mapping.student.email) || undefined
    : undefined;
  const discordId = mapping.student.discordId
    ? extractFieldValue(row, mapping.student.discordId) || undefined
    : undefined;
  const tagsRaw = mapping.student.tags
    ? extractFieldValue(row, mapping.student.tags)
    : '';

  const tags =
    tagsRaw.length > 0
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  return { name, email, discordId, tags };
}

/**
 * Parse phones from CSV row using normalized mapping
 */
export function parsePhonesFromMapping(
  row: Record<string, any>,
  mapping: NormalizedMapping
): Array<{ phone: string; isPrimary: boolean }> {
  const phones: Array<{ phone: string; isPrimary: boolean }> = [];

  for (let i = 0; i < mapping.phones.length; i++) {
    const phoneMapping = mapping.phones[i];
    const phoneValue = extractFieldValue(row, phoneMapping.column);

    if (phoneValue && phoneValue.length > 0) {
      // First phone (index 0 or first in list) is primary
      const isPrimary =
        i === 0 ||
        phoneMapping.index === 0 ||
        phoneMapping.name === 'primary';

      phones.push({
        phone: phoneValue,
        isPrimary,
      });
    }
  }

  return phones;
}

/**
 * Parse enrollment data from CSV row using normalized mapping
 */
export function parseEnrollmentFromMapping(
  row: Record<string, any>,
  mapping: NormalizedMapping
): {
  groupName?: string;
  courseName?: string;
  status?: string;
} {
  return {
    groupName: mapping.enrollment.groupName
      ? extractFieldValue(row, mapping.enrollment.groupName) || undefined
      : undefined,
    courseName: mapping.enrollment.courseName
      ? extractFieldValue(row, mapping.enrollment.courseName) || undefined
      : undefined,
    status: mapping.enrollment.status
      ? extractFieldValue(row, mapping.enrollment.status) || undefined
      : undefined,
  };
}

/**
 * Validate mapping structure
 */
export function validateMapping(
  mapping: OldMappingFormat | FlexibleMappingFormat
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredFields = getRequiredFields();

  const normalized = normalizeMapping(mapping);

  // Check required fields
  if (!normalized.student.name) {
    errors.push('Student name field is required');
  }

  // Validate field paths if using new format
  if (!('name' in mapping)) {
    // New format - validate field paths
    const flexibleMapping = mapping as FlexibleMappingFormat;
    for (const fieldPath of Object.keys(flexibleMapping)) {
      if (!fieldPath.startsWith('student.') && !fieldPath.startsWith('phone.') && !fieldPath.startsWith('enrollment.')) {
        errors.push(`Invalid field path: ${fieldPath}. Must start with 'student.', 'phone.', or 'enrollment.'`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

