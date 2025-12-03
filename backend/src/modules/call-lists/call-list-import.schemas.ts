import { z } from 'zod';

export const PreviewCallListImportSchema = z.object({
  // No body needed, file comes from multipart/form-data
});

export const CommitCallListImportSchema = z.object({
  importId: z.string().min(1, 'Import ID is required'), // Cache key from preview
  columnMapping: z.record(z.string(), z.string()), // { name: "column1", email: "column2", phone: "column3" }
  matchBy: z.enum(['email', 'phone', 'name', 'email_or_phone']).default('email_or_phone'),
  createNewStudents: z.boolean().default(true),
  skipDuplicates: z.boolean().default(true),
});

export type PreviewCallListImportInput = z.infer<typeof PreviewCallListImportSchema>;
export type CommitCallListImportInput = z.infer<typeof CommitCallListImportSchema>;

