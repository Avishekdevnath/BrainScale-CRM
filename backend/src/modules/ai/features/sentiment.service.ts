import { analyzeSentiment } from '../../../utils/ai-client';
import { logger } from '../../../config/logger';
import { CallLog } from '@prisma/client';

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'concerned';
  score: number;
}

/**
 * Analyze sentiment of a call log
 */
export const analyzeCallLogSentiment = async (callLog: CallLog): Promise<SentimentResult | null> => {
  try {
    // Combine all text sources for sentiment analysis
    const answers = Array.isArray(callLog.answers) ? callLog.answers : [];
    const notes = callLog.notes || '';
    const callerNote = callLog.callerNote || '';
    const status = callLog.status;

    // Build text for sentiment analysis
    const textParts: string[] = [];

    // Add answers (especially yes/no and text responses)
    answers.forEach((a: any) => {
      if (typeof a === 'object' && a.answer !== undefined) {
        if (typeof a.answer === 'string' && a.answer.trim()) {
          textParts.push(`Answer: ${a.answer}`);
        } else if (typeof a.answer === 'boolean') {
          textParts.push(`Answer: ${a.answer ? 'Yes' : 'No'}`);
        }
      }
    });

    // Add notes
    if (notes.trim()) {
      textParts.push(`Notes: ${notes}`);
    }

    // Add caller note
    if (callerNote.trim()) {
      textParts.push(`Caller Note: ${callerNote}`);
    }

    // Add status context
    if (status) {
      textParts.push(`Call Status: ${status}`);
    }

    const combinedText = textParts.join('\n\n');

    if (!combinedText.trim()) {
      logger.debug({ callLogId: callLog.id }, 'No text available for sentiment analysis');
      return null;
    }

    const result = await analyzeSentiment(combinedText);

    if (result) {
      logger.info(
        { callLogId: callLog.id, sentiment: result.sentiment, score: result.score },
        'Call log sentiment analyzed'
      );
      return result as SentimentResult;
    }

    return null;
  } catch (error) {
    logger.error({ callLogId: callLog.id, error }, 'Failed to analyze call log sentiment');
    return null;
  }
};

