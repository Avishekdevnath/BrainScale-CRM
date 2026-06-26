import { z } from 'zod';

export const SubmitFeedbackBody = z.object({
  message: z.string().min(10).max(2000),
  type: z.enum(['BUG', 'ISSUE', 'SUGGESTION', 'OTHER']).optional(),
});

export type SubmitFeedbackBodyInput = z.infer<typeof SubmitFeedbackBody>;
