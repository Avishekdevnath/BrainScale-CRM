import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Initialize clients based on provider
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

if (env.AI_ENABLED && env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

if (env.AI_ENABLED && env.AI_PROVIDER === 'anthropic' && env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  });
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a call log summary using AI
 */
export const generateSummary = async (
  prompt: string,
  retryCount = 0
): Promise<string | null> => {
  if (!env.AI_ENABLED) {
    logger.debug('AI is disabled, skipping summary generation');
    return null;
  }

  if (env.AI_PROVIDER === 'openai' && openaiClient) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates concise, professional summaries of customer call logs. Keep summaries to 2-3 sentences focusing on key outcomes and next steps.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const summary = response.choices[0]?.message?.content?.trim();
      if (summary) {
        logger.debug({ summaryLength: summary.length }, 'Summary generated successfully');
        return summary;
      }
    } catch (error: any) {
      const isRetryable =
        error?.status === 429 || // rate limit
        error?.status >= 500 || // server errors
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNECTION';

      if (isRetryable && retryCount < MAX_RETRIES) {
        logger.warn(
          { retryAttempt: retryCount + 1, error: error?.message },
          'OpenAI API error, retrying summary generation'
        );
        await sleep(RETRY_DELAY_MS * (retryCount + 1));
        return generateSummary(prompt, retryCount + 1);
      }

      logger.error({ error: error?.message, retryAttempt: retryCount }, 'Failed to generate summary via OpenAI');
      return null;
    }
  }

  if (env.AI_PROVIDER === 'anthropic' && anthropicClient) {
    try {
      const response = await anthropicClient.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: 'You are a helpful assistant that generates concise, professional summaries of customer call logs. Keep summaries to 2-3 sentences focusing on key outcomes and next steps.',
      });

      const summary = response.content[0]?.type === 'text' ? response.content[0].text.trim() : null;
      if (summary) {
        logger.debug({ summaryLength: summary.length }, 'Summary generated successfully');
        return summary;
      }
    } catch (error: any) {
      const isRetryable =
        error?.status === 429 || // rate limit
        error?.status >= 500 || // server errors
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNECTION';

      if (isRetryable && retryCount < MAX_RETRIES) {
        logger.warn(
          { retryAttempt: retryCount + 1, error: error?.message },
          'Anthropic API error, retrying summary generation'
        );
        await sleep(RETRY_DELAY_MS * (retryCount + 1));
        return generateSummary(prompt, retryCount + 1);
      }

      logger.error({ error: error?.message, retryAttempt: retryCount }, 'Failed to generate summary via Anthropic');
      return null;
    }
  }

  logger.warn('No AI provider configured or AI is disabled');
  return null;
};

/**
 * Analyze sentiment of text using AI
 */
export const analyzeSentiment = async (
  text: string,
  retryCount = 0
): Promise<{ sentiment: string; score: number } | null> => {
  if (!env.AI_ENABLED) {
    logger.debug('AI is disabled, skipping sentiment analysis');
    return null;
  }

  if (!text || text.trim().length === 0) {
    return null;
  }

  const sentimentPrompt = `Analyze the sentiment of the following call log notes and classify as one of: positive, neutral, negative, or concerned. Respond with JSON format: {"sentiment": "positive|neutral|negative|concerned", "score": 0.0-1.0}

Call log notes:
${text}`;

  if (env.AI_PROVIDER === 'openai' && openaiClient) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis assistant. Analyze call log notes and classify sentiment. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: sentimentPrompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        try {
          const result = JSON.parse(content);
          if (result.sentiment && ['positive', 'neutral', 'negative', 'concerned'].includes(result.sentiment)) {
            const score = typeof result.score === 'number' ? Math.max(0, Math.min(1, result.score)) : 0.5;
            logger.debug({ sentiment: result.sentiment, score }, 'Sentiment analyzed successfully');
            return { sentiment: result.sentiment, score };
          }
        } catch (parseError) {
          logger.warn({ parseError, content }, 'Failed to parse sentiment response');
        }
      }
    } catch (error: any) {
      const isRetryable =
        error?.status === 429 ||
        error?.status >= 500 ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNECTION';

      if (isRetryable && retryCount < MAX_RETRIES) {
        logger.warn(
          { retryAttempt: retryCount + 1, error: error?.message },
          'OpenAI API error, retrying sentiment analysis'
        );
        await sleep(RETRY_DELAY_MS * (retryCount + 1));
        return analyzeSentiment(text, retryCount + 1);
      }

      logger.error({ error: error?.message, retryAttempt: retryCount }, 'Failed to analyze sentiment via OpenAI');
      return null;
    }
  }

  if (env.AI_PROVIDER === 'anthropic' && anthropicClient) {
    try {
      const response = await anthropicClient.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: sentimentPrompt,
          },
        ],
        system: 'You are a sentiment analysis assistant. Analyze call log notes and classify sentiment. Always respond with valid JSON only.',
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text.trim() : null;
      if (content) {
        try {
          const result = JSON.parse(content);
          if (result.sentiment && ['positive', 'neutral', 'negative', 'concerned'].includes(result.sentiment)) {
            const score = typeof result.score === 'number' ? Math.max(0, Math.min(1, result.score)) : 0.5;
            logger.debug({ sentiment: result.sentiment, score }, 'Sentiment analyzed successfully');
            return { sentiment: result.sentiment, score };
          }
        } catch (parseError) {
          logger.warn({ parseError, content }, 'Failed to parse sentiment response');
        }
      }
    } catch (error: any) {
      const isRetryable =
        error?.status === 429 ||
        error?.status >= 500 ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNECTION';

      if (isRetryable && retryCount < MAX_RETRIES) {
        logger.warn(
          { retryAttempt: retryCount + 1, error: error?.message },
          'Anthropic API error, retrying sentiment analysis'
        );
        await sleep(RETRY_DELAY_MS * (retryCount + 1));
        return analyzeSentiment(text, retryCount + 1);
      }

      logger.error({ error: error?.message, retryAttempt: retryCount }, 'Failed to analyze sentiment via Anthropic');
      return null;
    }
  }

  logger.warn('No AI provider configured or AI is disabled');
  return null;
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ChatResponse {
  content: string;
  functionCalls?: Array<{
    name: string;
    arguments: any;
    result?: any;
  }>;
  metadata?: {
    tokensUsed?: number;
    model?: string;
  };
}

/**
 * Chat with AI using function calling
 */
export const chatWithFunctions = async (
  messages: ChatMessage[],
  functions: FunctionDefinition[],
  workspaceId: string,
  executeFunction: (name: string, args: any, workspaceId: string) => Promise<any>,
  retryCount = 0
): Promise<ChatResponse | null> => {
  if (!env.AI_ENABLED) {
    logger.debug('AI is disabled, skipping chat');
    return null;
  }

  if (env.AI_PROVIDER === 'openai' && openaiClient) {
    try {
      const tools = functions.map(fn => ({
        type: 'function' as const,
        function: {
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters,
        },
      }));

      // Map messages for OpenAI (handle tool role)
      const openaiMessages: any[] = messages.map(msg => {
        if (msg.role === 'tool') {
          return {
            role: 'tool',
            content: msg.content,
            tool_call_id: (msg as any).tool_call_id,
          };
        }
        if (msg.role === 'assistant' && (msg as any).tool_calls) {
          return {
            role: 'assistant',
            content: msg.content || null,
            tool_calls: (msg as any).tool_calls,
          };
        }
        return {
          role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        };
      });

      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const choice = response.choices[0];
      if (!choice) {
        return null;
      }

      const message = choice.message;

      // Handle function calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        const functionCalls: Array<{ name: string; arguments: any; result?: any }> = [];
        const functionMessages: ChatMessage[] = [];

        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name;
            let functionArgs: any = {};
            
            try {
              functionArgs = JSON.parse(toolCall.function.arguments || '{}');
            } catch (e) {
              logger.warn({ functionName, error: e }, 'Failed to parse function arguments');
            }

            // Execute function
            const result = await executeFunction(functionName, functionArgs, workspaceId);
            
            functionCalls.push({
              name: functionName,
              arguments: functionArgs,
              result,
            });

            // Add function result to messages for next iteration (OpenAI format)
            functionMessages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
            } as any);
          }
        }

        // Recursively call with function results
        // For OpenAI, we need to include the assistant message with tool_calls and tool messages
        const assistantMsg: any = {
          role: 'assistant',
          content: message.content || null,
        };
        if (message.tool_calls) {
          assistantMsg.tool_calls = message.tool_calls;
        }

        const newMessages = [
          ...messages,
          assistantMsg,
          ...functionMessages,
        ];

        return chatWithFunctions(newMessages, functions, workspaceId, executeFunction, retryCount);
      }

      // Return final response
      const content = message.content || '';
      return {
        content,
        metadata: {
          tokensUsed: response.usage?.total_tokens,
          model: response.model,
        },
      };
    } catch (error: any) {
      const isRetryable =
        error?.status === 429 ||
        error?.status >= 500 ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNECTION';

      if (isRetryable && retryCount < MAX_RETRIES) {
        logger.warn(
          { retryAttempt: retryCount + 1, error: error?.message },
          'OpenAI API error, retrying chat'
        );
        await sleep(RETRY_DELAY_MS * (retryCount + 1));
        return chatWithFunctions(messages, functions, workspaceId, executeFunction, retryCount + 1);
      }

      logger.error({ error: error?.message, retryAttempt: retryCount }, 'Failed to chat via OpenAI');
      return null;
    }
  }

  if (env.AI_PROVIDER === 'anthropic' && anthropicClient) {
    try {
      const tools = functions.map(fn => ({
        name: fn.name,
        description: fn.description,
        input_schema: fn.parameters,
      }));

      // Map messages for Anthropic (handle tool results and tool_use blocks)
      const anthropicMessages: any[] = [];
      for (const msg of messages) {
        if (msg.role === 'system') continue;
        
        if (msg.role === 'user' && Array.isArray((msg as any).content)) {
          // Handle tool results
          anthropicMessages.push({
            role: 'user',
            content: (msg as any).content,
          });
        } else if (msg.role === 'assistant' && Array.isArray((msg as any).content)) {
          // Handle assistant message with tool_use blocks
          anthropicMessages.push({
            role: 'assistant',
            content: (msg as any).content,
          });
        } else {
          // Regular text message
          anthropicMessages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          });
        }
      }

      const response = await anthropicClient.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1000,
        messages: anthropicMessages,
        system: messages.find(msg => msg.role === 'system')?.content || '',
        tools: tools.length > 0 ? tools : undefined,
      });

      const contentBlock = response.content.find(block => block.type === 'text');
      const toolUseBlocks = response.content.filter(block => block.type === 'tool_use') as any[];

      // Handle function calls
      if (toolUseBlocks.length > 0) {
        const functionCalls: Array<{ name: string; arguments: any; result?: any }> = [];
        const toolResults: any[] = [];

        for (const toolUse of toolUseBlocks) {
          const functionName = toolUse.name;
          const functionArgs = toolUse.input || {};

          // Execute function
          const result = await executeFunction(functionName, functionArgs, workspaceId);
          
          functionCalls.push({
            name: functionName,
            arguments: functionArgs,
            result,
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        }

        // Recursively call with function results
        const newMessages = [
          ...messages,
          {
            role: 'assistant',
            content: response.content,
          },
          {
            role: 'user',
            content: toolResults,
          },
        ];

        return chatWithFunctions(newMessages, functions, workspaceId, executeFunction, retryCount);
      }

      // Return final response
      return {
        content: contentText || '',
        metadata: {
          tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
          model: response.model,
        },
      };
    } catch (error: any) {
      const isRetryable =
        error?.status === 429 ||
        error?.status >= 500 ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNECTION';

      if (isRetryable && retryCount < MAX_RETRIES) {
        logger.warn(
          { retryAttempt: retryCount + 1, error: error?.message },
          'Anthropic API error, retrying chat'
        );
        await sleep(RETRY_DELAY_MS * (retryCount + 1));
        return chatWithFunctions(messages, functions, workspaceId, executeFunction, retryCount + 1);
      }

      logger.error({ error: error?.message, retryCount }, 'Failed to chat via Anthropic');
      return null;
    }
  }

  logger.warn('No AI provider configured or AI is disabled');
  return null;
};

