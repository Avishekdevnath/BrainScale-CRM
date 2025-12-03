/**
 * Field registry for import/export operations.
 * Defines available field paths, their types, labels, and metadata.
 * Used for validation, auto-suggestions, and documentation.
 */

export interface FieldDefinition {
  type: 'string' | 'email' | 'phone' | 'array' | 'enum';
  required: boolean;
  label: string;
  description: string;
  enumValues?: string[]; // For enum types
}

export const AVAILABLE_FIELDS: Record<string, FieldDefinition> = {
  // Basic student fields
  'student.name': {
    type: 'string',
    required: true,
    label: 'Name',
    description: 'Student full name (required)',
  },
  'student.email': {
    type: 'email',
    required: false,
    label: 'Email',
    description: 'Student email address',
  },
  'student.discordId': {
    type: 'string',
    required: false,
    label: 'Discord ID',
    description: 'Discord handle or ID for the student',
  },
  'student.tags': {
    type: 'array',
    required: false,
    label: 'Tags',
    description: 'Comma-separated tags for the student',
  },

  // Phone fields (indexed)
  'phone.0': {
    type: 'phone',
    required: false,
    label: 'Primary Phone',
    description: 'First phone number (marked as primary)',
  },
  'phone.1': {
    type: 'phone',
    required: false,
    label: 'Secondary Phone',
    description: 'Second phone number',
  },
  'phone.2': {
    type: 'phone',
    required: false,
    label: 'Phone 3',
    description: 'Third phone number',
  },
  'phone.3': {
    type: 'phone',
    required: false,
    label: 'Phone 4',
    description: 'Fourth phone number',
  },

  // Phone fields (named)
  'phone.primary': {
    type: 'phone',
    required: false,
    label: 'Primary Phone',
    description: 'Primary phone number',
  },
  'phone.secondary': {
    type: 'phone',
    required: false,
    label: 'Secondary Phone',
    description: 'Secondary phone number',
  },
  'phone.alternate': {
    type: 'phone',
    required: false,
    label: 'Alternate Phone',
    description: 'Alternate phone number',
  },

  // Enrollment fields
  'enrollment.groupName': {
    type: 'string',
    required: false,
    label: 'Group Name',
    description: 'Group name (lookup by name, creates enrollment)',
  },
  'enrollment.courseName': {
    type: 'string',
    required: false,
    label: 'Course Name',
    description: 'Course name (lookup by name, adds to enrollment)',
  },
  'enrollment.status': {
    type: 'enum',
    required: false,
    label: 'Status',
    description: 'Student status for the group',
    enumValues: ['NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'CONVERTED', 'LOST'],
  },

  // Batch fields
  'batch.names': {
    type: 'array',
    required: false,
    label: 'Batch Names',
    description: 'Comma-separated batch names (pipe-separated in export)',
  },
  'batch.ids': {
    type: 'array',
    required: false,
    label: 'Batch IDs',
    description: 'Comma-separated batch IDs (pipe-separated in export)',
  },
};

/**
 * Get all available field paths
 */
export function getAvailableFieldPaths(): string[] {
  return Object.keys(AVAILABLE_FIELDS);
}

/**
 * Get field definition by path
 */
export function getFieldDefinition(path: string): FieldDefinition | undefined {
  return AVAILABLE_FIELDS[path];
}

/**
 * Check if a field path is valid
 */
export function isValidFieldPath(path: string): boolean {
  return path in AVAILABLE_FIELDS;
}

/**
 * Get required fields
 */
export function getRequiredFields(): string[] {
  return Object.entries(AVAILABLE_FIELDS)
    .filter(([_, def]) => def.required)
    .map(([path]) => path);
}

/**
 * Get fields by category
 */
export function getFieldsByCategory() {
  return {
    student: Object.entries(AVAILABLE_FIELDS)
      .filter(([path]) => path.startsWith('student.'))
      .map(([path, def]) => ({ path, ...def })),
    phone: Object.entries(AVAILABLE_FIELDS)
      .filter(([path]) => path.startsWith('phone.'))
      .map(([path, def]) => ({ path, ...def })),
    enrollment: Object.entries(AVAILABLE_FIELDS)
      .filter(([path]) => path.startsWith('enrollment.'))
      .map(([path, def]) => ({ path, ...def })),
  };
}

