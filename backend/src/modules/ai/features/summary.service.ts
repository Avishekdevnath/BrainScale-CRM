import { generateSummary } from '../../../utils/ai-client';
import { logger } from '../../../config/logger';
import { CallLog } from '@prisma/client';

/**
 * Generate a summary for a call log
 */
export const generateCallLogSummary = async (callLog: CallLog & {
  student?: { name: string } | null;
}): Promise<string | null> => {
  try {
    // Build prompt from call log data
    const studentName = callLog.student?.name || 'Student';
    const answers = Array.isArray(callLog.answers) ? callLog.answers : [];
    const notes = callLog.notes || '';
    const callerNote = callLog.callerNote || '';
    const status = callLog.status;
    const duration = callLog.callDuration ? `${Math.floor(callLog.callDuration / 60)} minutes` : 'unknown duration';

    // Format answers for prompt
    const answersText = answers
      .map((a: any) => {
        if (typeof a === 'object' && a.question && a.answer !== undefined) {
          return `Q: ${a.question}\nA: ${a.answer}`;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n\n');

    // Build comprehensive prompt
    const prompt = `Generate a concise 2-3 sentence summary of this call log:

Student: ${studentName}
Call Status: ${status}
Call Duration: ${duration}

${answersText ? `Question & Answers:\n${answersText}\n\n` : ''}${notes ? `Additional Notes:\n${notes}\n\n` : ''}${callerNote ? `Caller Observations:\n${callerNote}` : ''}

Summary should focus on:
- Key outcomes from the call
- Student's main concerns or responses
- Any important next steps or follow-up needs

Generate the summary now:`;

    const summary = await generateSummary(prompt);
    
    if (summary) {
      logger.info({ callLogId: callLog.id, summaryLength: summary.length }, 'Call log summary generated');
      return summary;
    }

    return null;
  } catch (error) {
    logger.error({ callLogId: callLog.id, error }, 'Failed to generate call log summary');
    return null;
  }
};

