import { z } from 'zod';

export const CommitImportSchema = z.object({
  columnMapping: z.record(z.string(), z.string()), // { name: "column1", email: "column2", phone: "column3" }
  groupId: z.string().min(1, 'Group ID is required'),
  batchIds: z.array(z.string()).optional(),
  skipDuplicates: z.boolean().optional().default(true),
});

export type CommitImportInput = z.infer<typeof CommitImportSchema>;

