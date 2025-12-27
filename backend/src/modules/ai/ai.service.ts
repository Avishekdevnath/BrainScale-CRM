import { prisma } from '../../db/client';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { generateCallLogSummary } from './features/summary.service';
import { analyzeCallLogSentiment, SentimentResult } from './features/sentiment.service';

/**
 * Check if a specific AI feature is enabled for a workspace
 */
export const isFeatureEnabled = async (
  workspaceId: string,
  feature: string
): Promise<boolean> => {
  // Check global AI enabled flag
  if (!env.AI_ENABLED) {
    return false;
  }

  // Check workspace-level feature flag
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      aiFeaturesEnabled: true,
      aiFeatures: true,
    },
  });

  if (!workspace) {
    return false;
  }

  // If workspace AI is disabled, return false
  if (!workspace.aiFeaturesEnabled) {
    return false;
  }

  // Check if feature is in workspace features array
  if (workspace.aiFeatures && Array.isArray(workspace.aiFeatures)) {
    if (workspace.aiFeatures.includes(feature)) {
      return true;
    }
  }

  // Fallback to global AI_FEATURES env var
  if (env.AI_FEATURES.length > 0) {
    return env.AI_FEATURES.includes(feature);
  }

  // If no specific features configured, enable all if workspace AI is enabled
  return workspace.aiFeaturesEnabled;
};

/**
 * Process a call log with AI features
 */
export const processCallLog = async (callLogId: string): Promise<void> => {
  const startTime = Date.now();

  try {
    // Update status to pending
    await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        aiProcessingStatus: 'pending',
      },
    });

    // Fetch call log with relations
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: {
        student: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!callLog) {
      logger.warn({ callLogId }, 'Call log not found for AI processing');
      await prisma.callLog.update({
        where: { id: callLogId },
        data: {
          aiProcessingStatus: 'failed',
        },
      });
      return;
    }

    // Check if summary feature is enabled
    const summaryEnabled = await isFeatureEnabled(callLog.workspaceId, 'summary');
    const sentimentEnabled = await isFeatureEnabled(callLog.workspaceId, 'sentiment');

    if (!summaryEnabled && !sentimentEnabled) {
      logger.debug({ callLogId, workspaceId: callLog.workspaceId }, 'AI features not enabled for workspace');
      await prisma.callLog.update({
        where: { id: callLogId },
        data: {
          aiProcessingStatus: 'completed',
        },
      });
      return;
    }

    // Process summary if enabled
    let summary: string | null = null;
    if (summaryEnabled) {
      summary = await generateCallLogSummary(callLog);
    }

    // Process sentiment if enabled
    let sentimentResult: SentimentResult | null = null;
    if (sentimentEnabled) {
      sentimentResult = await analyzeCallLogSentiment(callLog);
    }

    // Update call log with results
    const updateData: any = {
      aiProcessingStatus: 'completed',
      aiProcessedAt: new Date(),
    };

    if (summary !== null) {
      updateData.summaryNote = summary;
    }

    if (sentimentResult !== null) {
      updateData.sentiment = sentimentResult.sentiment;
      updateData.sentimentScore = sentimentResult.score;
    }

    await prisma.callLog.update({
      where: { id: callLogId },
      data: updateData,
    });

    const processingTime = Date.now() - startTime;
    logger.info(
      {
        callLogId,
        workspaceId: callLog.workspaceId,
        summaryGenerated: summary !== null,
        sentimentAnalyzed: sentimentResult !== null,
        processingTimeMs: processingTime,
      },
      'AI processing completed successfully'
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(
      { callLogId, error, processingTimeMs: processingTime },
      'AI processing failed'
    );

    // Update status to failed
    try {
      await prisma.callLog.update({
        where: { id: callLogId },
        data: {
          aiProcessingStatus: 'failed',
        },
      });
    } catch (updateError) {
      logger.error({ callLogId, updateError }, 'Failed to update AI processing status');
    }
  }
};

