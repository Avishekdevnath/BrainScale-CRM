'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { MessageCircle, Loader2, AlertCircle, ArrowDown } from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek, parseISO, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import ChannelHeader from './ChannelHeader';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import { MessageHoverMenu } from './MessageHoverMenu';
import { MessageReactions } from './MessageReactions';
import { ReadReceiptIndicator } from './ReadReceiptIndicator';
import { TypingIndicator } from './TypingIndicator';
import { apiClient } from '@/lib/api-client';
import { useMessageActions } from '../hooks/useMessageActions';
import { useTypingStatus } from '../hooks/useTypingStatus';
import { useTeamChat } from '../hooks/useTeamChat';
import type { Message, DirectMessage, Channel, TiptapContent, ChatUser, ReadReceipt } from '@/types/team-chat.types';

interface MessageViewProps {
  type: 'channel' | 'direct-message';
  messages: (Message | DirectMessage)[];
  onRefresh?: () => void;
  onSendMessage?: (content: TiptapContent, mentionedUsers?: string[]) => Promise<void>;
  channelId?: string;
  userId?: string; // for DM: the other user's id
  channel?: Channel;
  dmRecipient?: ChatUser;
  isLoading?: boolean;
  error?: Error | null;
  onMenuClick?: () => void;
  currentUserId?: string;
  readReceipts?: Record<string, ReadReceipt[]>; // messageId -> receipts
}

function formatDateDivider(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEEE');
  return format(d, 'MMMM d, yyyy');
}

function initialsFromName(name: string) {
  return (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || 'U';
}

export default function MessageView({
  type,
  messages,
  onRefresh,
  onSendMessage,
  channelId,
  userId,
  channel,
  dmRecipient,
  isLoading = false,
  error = null,
  onMenuClick,
  currentUserId = '',
  readReceipts = {},
}: MessageViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const { messageReactions, addReaction, removeReaction, deleteMessage, deleteDirectMessage, editMessage } =
    useMessageActions();

  const { typingUsers, reportTyping } = useTypingStatus({
    channelId: type === 'channel' ? channelId : undefined,
    dmUserId: type === 'direct-message' ? userId : undefined,
    enabled: !!(channelId || userId),
  });

  // Auto-mark visible messages as read
  useEffect(() => {
    if (!currentUserId || messages.length === 0) return;
    const unread = messages
      .filter((m) => {
        const receipts = readReceipts[m.id] || [];
        return m.sender?.id !== currentUserId && !receipts.some((r) => r.userId === currentUserId);
      })
      .map((m) => m.id);

    if (unread.length === 0) return;

    apiClient.markTeamChatMessagesAsRead(unread).catch(() => {});
  }, [messages, currentUserId, readReceipts]);

  // Group messages by date, and collapse consecutive messages by the same sender within 5 minutes
  const grouped = useMemo(() => {
    const groups: Array<{
      dateKey: string;
      items: Array<{ message: Message | DirectMessage; showHeader: boolean }>;
    }> = [];

    messages.forEach((msg, idx) => {
      const dateKey = format(parseISO(msg.createdAt), 'yyyy-MM-dd');
      const showHeader = true;

      const lastGroup = groups[groups.length - 1];
      const sameDay = lastGroup && lastGroup.dateKey === dateKey;

      if (!sameDay) {
        groups.push({ dateKey, items: [{ message: msg, showHeader }] });
      } else {
        lastGroup.items.push({ message: msg, showHeader });
      }
    });

    return groups;
  }, [messages]);

  // Smart auto-scroll: only if user is already near bottom or it's initial load
  useEffect(() => {
    const c = scrollContainerRef.current;
    if (!c) return;
    const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
    if (isInitialLoad || nearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: isInitialLoad ? 'auto' : 'smooth' });
      if (isInitialLoad && messages.length > 0) setIsInitialLoad(false);
    }
  }, [messages, isInitialLoad]);

  const handleScroll = () => {
    const c = scrollContainerRef.current;
    if (!c) return;
    const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
    setShowScrollButton(!nearBottom && messages.length > 0);
  };

  const handleSend = async (content: TiptapContent, mentionedUsers?: string[]) => {
    if (onSendMessage) await onSendMessage(content, mentionedUsers);
  };

  const handleDelete = (messageId: string) => {
    if (type === 'channel' && channelId) {
      deleteMessage(messageId, channelId);
    } else if (type === 'direct-message' && userId) {
      deleteDirectMessage(messageId, userId);
    }
  };

  const handleEdit = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    setEditingMessageId(messageId);
    setEditText(msg.contentPlain);
  };

  const handleEditSave = async (messageId: string) => {
    if (!editText.trim()) return;
    // DM edit is out of scope — no backend endpoint exists for DirectMessage edits.
    if (type === 'channel' && channelId) {
      await editMessage(messageId, channelId, editText.trim());
    }
    setEditingMessageId(null);
    setEditText('');
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const headerTitle =
    type === 'channel' ? channel?.name : dmRecipient?.name || 'Direct Message';

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--groups1-background)]">
      {/* Header */}
      {type === 'channel' && channel ? (
        <ChannelHeader channel={channel} onRefresh={onRefresh} onMenuClick={onMenuClick} />
      ) : (
        <ChatHeader
          title={
            <span className="inline-flex items-center gap-2.5">
              {dmRecipient && (
                <span className="w-8 h-8 rounded-full inline-flex items-center justify-center text-xs font-semibold bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]">
                  {initialsFromName(dmRecipient.name)}
                </span>
              )}
              <span className="truncate">{headerTitle}</span>
            </span>
          }
          subtitle={dmRecipient?.email}
          onMenuClick={onMenuClick}
        />
      )}

      {/* Messages container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        {error ? (
          <div className="flex items-center justify-center h-full px-6">
            <div className="text-center max-w-sm">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-[var(--groups1-text)]">
                {error.message || 'Something went wrong'}
              </p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="mt-4 px-4 h-9 rounded-lg text-sm font-medium bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        ) : messages.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full px-6">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)]">
                <MessageCircle className="w-7 h-7" />
              </div>
              <p className="text-base font-semibold text-[var(--groups1-text)]">
                No messages yet
              </p>
              <p className="text-sm text-[var(--groups1-text-secondary)] mt-1">
                {type === 'channel'
                  ? `Be the first to message ${channel?.name ? `#${channel.name}` : 'this channel'}.`
                  : `Start the conversation with ${dmRecipient?.name || 'this person'}.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 md:px-6 py-4 space-y-1">
            {isLoading && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--groups1-text-secondary)]" />
              </div>
            )}

            {grouped.map((group) => (
              <div key={group.dateKey} className="space-y-1">
                {/* Date divider */}
                <div className="relative flex items-center my-4">
                  <div className="flex-1 border-t border-[var(--groups1-border)]" />
                  <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--groups1-text-secondary)] bg-[var(--groups1-background)]">
                    {formatDateDivider(group.items[0].message.createdAt)}
                  </span>
                  <div className="flex-1 border-t border-[var(--groups1-border)]" />
                </div>

                {group.items.map(({ message, showHeader }) => {
                  const isOwn = message.sender?.id === currentUserId;
                  const reactions = messageReactions.get(message.id) || [];
                  const receipts = readReceipts[message.id] || [];

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'group relative flex gap-3 px-2 py-1 rounded-lg hover:bg-[var(--groups1-secondary)]/40 transition-colors',
                        isOwn && 'flex-row-reverse justify-end'
                      )}
                    >
                      {showHeader && (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                          aria-hidden="true"
                        >
                          {initialsFromName(message.sender.name)}
                        </div>
                      )}

                      <div className={cn(
                        'flex-1 min-w-0 rounded-md px-3 py-2',
                        isOwn ? 'bg-[var(--groups1-primary)]/20' : 'bg-transparent'
                      )}>
                        {showHeader && (
                          <div className={cn(
                            'flex items-baseline gap-2',
                            isOwn && 'justify-end'
                          )}>
                            <span className="font-semibold text-sm text-[var(--groups1-text)]">
                              {message.sender.name}
                            </span>
                            <time
                              className="text-[11px] text-[var(--groups1-text-secondary)]"
                              title={format(parseISO(message.createdAt), 'PPpp')}
                            >
                              {format(parseISO(message.createdAt), 'h:mm a')}
                            </time>
                            {message.editedAt && (
                              <span className="text-[11px] text-[var(--groups1-text-secondary)]">
                                (edited)
                              </span>
                            )}
                          </div>
                        )}

                        {editingMessageId === message.id ? (
                          <div className="mt-1">
                            <textarea
                              autoFocus
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                  e.preventDefault();
                                  handleEditSave(message.id);
                                }
                                if (e.key === 'Escape') {
                                  handleEditCancel();
                                }
                              }}
                              className="w-full resize-none rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-sm text-[var(--groups1-text)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--groups1-primary)]"
                              rows={Math.max(2, editText.split('\n').length)}
                            />
                            <div className="flex gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => handleEditSave(message.id)}
                                className="text-xs px-2 py-1 rounded bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:opacity-90 transition-opacity"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={handleEditCancel}
                                className="text-xs px-2 py-1 rounded border border-[var(--groups1-border)] text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] transition-colors"
                              >
                                Cancel
                              </button>
                              <span className="text-[10px] text-[var(--groups1-text-secondary)] self-center">
                                Ctrl+Enter to save · Esc to cancel
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-[var(--groups1-text)] break-words whitespace-pre-wrap leading-relaxed">
                            {message.contentPlain}
                          </p>
                        )}

                        {/* Reactions */}
                        {reactions.length > 0 && (
                          <MessageReactions
                            messageId={message.id}
                            reactions={reactions}
                            currentUserId={currentUserId}
                            onAdd={addReaction}
                            onRemove={removeReaction}
                          />
                        )}

                        {/* Read receipt (own messages only) */}
                        {isOwn && (
                          <div className="flex justify-end mt-0.5">
                            <ReadReceiptIndicator receipts={receipts} isOwn={isOwn} />
                          </div>
                        )}
                      </div>

                      {/* Hover menu */}
                      <div className="absolute top-0 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageHoverMenu
                          messageId={message.id}
                          isOwn={isOwn}
                          currentUserId={currentUserId}
                          onReact={addReaction}
                          onDelete={handleDelete}
                          onEdit={handleEdit}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll-to-bottom */}
        {showScrollButton && (
          <button
            type="button"
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            aria-label="Scroll to latest"
            className={cn(
              'absolute bottom-4 right-4 md:right-6 w-10 h-10 rounded-full shadow-lg flex items-center justify-center',
              'bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:opacity-90 transition-opacity'
            )}
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTyping={reportTyping}
        placeholder={
          type === 'channel'
            ? `Message #${channel?.name || ''}`
            : `Message ${dmRecipient?.name || ''}`
        }
      />
    </div>
  );
}
