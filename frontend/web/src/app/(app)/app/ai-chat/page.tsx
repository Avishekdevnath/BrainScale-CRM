"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import "./chat-scrollbar.css";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { Loader2, Sparkles, Trash2, Bot, User, Search, Download, ChevronDown, X, AlertTriangle } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { TypingIndicator } from "@/components/ai-chat/TypingIndicator";
import { MessageActions } from "@/components/ai-chat/MessageActions";
import { ExportDialog } from "@/components/ai-chat/ExportDialog";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday, isThisWeek, differenceInDays } from "date-fns";
import type { ChatMessage } from "@/types/ai-chat.types";
import { useChatStore } from "@/store/chat";

const STARTER_QUESTIONS = [
  "How many students do we have?",
  "How many calls were made today?",
  "Who made the most calls this week?",
  "Which group has the most students?",
  "Are there any overdue follow-ups?",
  "Show call trends for this month",
];

const MAX_MESSAGE_LENGTH = 5000;

interface GroupedMessages {
  date: string;
  label: string;
  messages: ChatMessage[];
}

export default function AIChatPage() {
  usePageTitle("AI Chat");

  const { selectedChatId, chats, setChats, addChat, updateChat, setSelectedChatId } = useChatStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Compute selected chat info
  const selectedChat = selectedChatId ? chats.find((c) => c.id === selectedChatId) ?? null : null;
  const chatName = selectedChat?.title
    ? selectedChat.title
    : selectedChat?.summary
    ? selectedChat.summary.length > 50
      ? selectedChat.summary.substring(0, 47) + "..."
      : selectedChat.summary
    : selectedChatId
    ? "New Chat"
    : null;
  const chatSummary =
    selectedChat?.title && selectedChat?.summary
      ? selectedChat.summary.length > 60
        ? selectedChat.summary.substring(0, 57) + "..."
        : selectedChat.summary
      : null;

  // Suggested follow-up questions based on last assistant message
  const suggestedQuestions = useMemo(() => {
    const assistantMsgs = messages.filter((m) => m.role === "assistant");
    const last = assistantMsgs[assistantMsgs.length - 1];
    if (!last) return [];
    const c = last.content.toLowerCase();
    const pool: string[] = [];
    if (c.includes("student") || c.includes("enroll")) {
      pool.push("Which group has the most students?", "Show me top student tags");
    }
    if (c.includes("call") || c.includes("trend")) {
      pool.push("Show call trends for this week", "Who made the most calls today?");
    }
    if (c.includes("follow") || c.includes("overdue")) {
      pool.push("How many follow-ups are overdue?", "Show all pending follow-ups");
    }
    if (c.includes("group") || c.includes("batch")) {
      pool.push("List all groups", "Which group has the most calls?");
    }
    if (c.includes("caller") || c.includes("counselor") || c.includes("performance")) {
      pool.push("Show counselor performance this month", "Who has the best completion rate?");
    }
    return (
      pool.length > 0
        ? pool
        : ["How many calls were made today?", "Show pending follow-ups", "Who are the top callers this week?"]
    ).slice(0, 3);
  }, [messages]);

  const handleSuggestionClick = (text: string) => {
    setInputMessage(text);
    textareaRef.current?.focus();
    // Resize textarea to fit new text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      }
    }, 0);
  };

  // Load messages when selectedChatId changes
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    const loadHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const history = await apiClient.getChatHistory(selectedChatId, 50);
        setMessages(history);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load chat history";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    void loadHistory();
  }, [selectedChatId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  // Check if scroll button should be visible
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Filter messages by search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter((msg) => msg.content.toLowerCase().includes(query));
  }, [messages, searchQuery]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: GroupedMessages[] = [];
    let currentGroup: GroupedMessages | null = null;

    filteredMessages.forEach((message) => {
      const date = new Date(message.createdAt);
      let label = "";

      if (isToday(date)) {
        label = "Today";
      } else if (isYesterday(date)) {
        label = "Yesterday";
      } else if (isThisWeek(date)) {
        label = format(date, "EEEE");
      } else if (differenceInDays(new Date(), date) < 7) {
        label = format(date, "EEEE");
      } else {
        label = format(date, "MMMM d, yyyy");
      }

      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { date: format(date, "yyyy-MM-dd"), label, messages: [] };
        groups.push(currentGroup);
      }
      currentGroup.messages.push(message);
    });

    return groups;
  }, [filteredMessages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessageText = inputMessage.trim();
    setInputMessage("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);
    setError(null);
    setShowClearConfirm(false);

    let currentChatId = selectedChatId;
    if (!currentChatId) {
      try {
        const newChat = await apiClient.createChat();
        addChat(newChat);
        setSelectedChatId(newChat.id);
        currentChatId = newChat.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create chat";
        setError(message);
        toast.error(message);
        setIsLoading(false);
        return;
      }
    }

    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      chatId: currentChatId,
      workspaceId: "",
      userId: "",
      role: "user",
      content: userMessageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    try {
      const response = await apiClient.sendChatMessage(userMessageText, currentChatId);

      if (response.chatId !== currentChatId) {
        setSelectedChatId(response.chatId);
      }

      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id);
        return [...filtered, response.userMessage, response.assistantMessage];
      });

      const chatsList = await apiClient.getChats();
      setChats(chatsList);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      textareaRef.current?.focus();
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id));
      const message = err instanceof Error ? err.message : "Failed to send message";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!selectedChatId) {
      toast.error("No chat selected");
      return;
    }
    try {
      await apiClient.clearChatHistory(selectedChatId);
      setMessages([]);
      setSearchQuery("");
      setShowClearConfirm(false);
      toast.success("Chat history cleared");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to clear chat history";
      toast.error(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  };

  const formatAbsoluteTime = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (isLoadingHistory) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 pb-6">
          <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">AI Chat</h1>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Ask questions about your workspace data and get AI-powered insights
          </p>
        </div>
        <Card variant="groups1" className="flex-1 flex flex-col min-h-0">
          <CardContent variant="groups1" className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--groups1-text-secondary)]" />
              <p className="text-sm text-[var(--groups1-text-secondary)]">Loading chat history...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col min-w-0 flex-1">
            {chatName ? (
              <>
                <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">{chatName}</h1>
                {chatSummary && (
                  <p className="text-sm text-[var(--groups1-text-secondary)]">{chatSummary}</p>
                )}
              </>
            ) : null}
          </div>

          <div className="flex gap-2">
            {messages.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportDialog(true)}
                  className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearConfirm(true)}
                  className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>

        {messages.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--groups1-text-secondary)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="pl-10 bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-4 h-4 text-[var(--groups1-text-secondary)]" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Chat Container */}
      <Card variant="groups1" className="flex-1 flex flex-col min-h-0 overflow-hidden shadow-lg">
        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="chat-messages-container flex-1 overflow-y-auto p-6 space-y-6 min-h-0 relative"
        >
          <CardContent variant="groups1" className="p-0">
            {filteredMessages.length === 0 && !isLoading ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center py-12"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-5"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--groups1-primary)] to-purple-600 flex items-center justify-center shadow-lg">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                </motion.div>
                <h3 className="text-xl font-semibold text-[var(--groups1-text)] mb-2">
                  {searchQuery ? "No messages found" : "Hey, I'm Brain!"}
                </h3>
                <p className="text-sm text-[var(--groups1-text-secondary)] max-w-md mb-6">
                  {searchQuery
                    ? "Try a different search query"
                    : "I can help you find students, analyze call logs, view statistics, create call lists, and more. What would you like to know?"}
                </p>
                {!searchQuery && (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--groups1-text-secondary)] font-medium">Try asking:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {STARTER_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleSuggestionClick(q)}
                          className="text-xs px-3 py-1.5 rounded-full border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)] hover:border-[var(--groups1-primary)] transition-colors cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <>
                <AnimatePresence>
                  {groupedMessages.map((group) => (
                    <div key={group.date} className="space-y-4">
                      {/* Date separator */}
                      <div className="flex items-center gap-4 my-4">
                        <div className="flex-1 h-px bg-[var(--groups1-border)]" />
                        <span className="text-xs font-medium text-[var(--groups1-text-secondary)] px-2">
                          {group.label}
                        </span>
                        <div className="flex-1 h-px bg-[var(--groups1-border)]" />
                      </div>
                      {group.messages.map((message, msgIndex) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: msgIndex * 0.05 }}
                          className={cn(
                            "flex gap-3 group",
                            message.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          {message.role === "assistant" && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--groups1-primary)] to-purple-600 flex items-center justify-center shadow-sm">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[80%] rounded-lg px-4 py-3 shadow-sm transition-shadow hover:shadow-md relative",
                              message.role === "user"
                                ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                                : "bg-[var(--groups1-surface)] border border-[var(--groups1-border)] text-[var(--groups1-text)]"
                            )}
                          >
                            <div className="break-words">
                              <MarkdownRenderer content={message.content} />
                            </div>
                            <div className="flex items-center justify-between mt-2 gap-2">
                              <div
                                className={cn(
                                  "text-xs",
                                  message.role === "user"
                                    ? "text-[var(--groups1-btn-primary-text)] opacity-70"
                                    : "text-[var(--groups1-text-secondary)]"
                                )}
                                title={formatAbsoluteTime(message.createdAt)}
                              >
                                {formatRelativeTime(message.createdAt)}
                              </div>
                              <MessageActions
                                content={message.content}
                                role={message.role}
                              />
                            </div>
                          </div>
                          {message.role === "user" && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--groups1-secondary)] flex items-center justify-center shadow-sm">
                              <User className="w-4 h-4 text-[var(--groups1-text)]" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ))}
                </AnimatePresence>
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-24 right-8 z-20"
          >
            <Button
              onClick={scrollToBottom}
              size="sm"
              className="rounded-full w-10 h-10 p-0 bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] shadow-lg hover:shadow-xl"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-[var(--groups1-border)] p-4 bg-[var(--groups1-background)] z-10">
          {/* Inline clear confirmation */}
          <AnimatePresence>
            {showClearConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 flex items-center gap-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40"
              >
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300 flex-1">
                  Clear all messages in this chat? This cannot be undone.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowClearConfirm(false)}
                  className="h-7 text-xs border-red-200 dark:border-red-900"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleClearHistory}
                  className="h-7 text-xs bg-red-500 hover:bg-red-600 text-white border-none"
                >
                  Clear
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}

          {suggestedQuestions.length > 0 && !isLoading && (
            <div className="flex gap-2 flex-wrap mb-3">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSuggestionClick(q)}
                  className="text-xs px-3 py-1 rounded-full border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text-secondary)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)] hover:border-[var(--groups1-primary)] transition-colors truncate max-w-[220px] cursor-pointer"
                  title={q}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleTextareaInput}
                placeholder="Ask Brain anything... (Enter to send, Shift+Enter for new line)"
                disabled={isLoading}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                className={cn(
                  "w-full resize-none overflow-y-auto rounded-md border px-3 py-2 text-sm leading-relaxed",
                  "bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)]",
                  "placeholder:text-[var(--groups1-text-secondary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                  "transition-all max-h-32 disabled:opacity-50"
                )}
              />
              {inputMessage.length > 0 && (
                <span
                  className={cn(
                    "absolute bottom-2 right-2 text-xs pointer-events-none",
                    inputMessage.length > MAX_MESSAGE_LENGTH * 0.9
                      ? "text-red-500"
                      : "text-[var(--groups1-text-secondary)]"
                  )}
                >
                  {inputMessage.length}/{MAX_MESSAGE_LENGTH}
                </span>
              )}
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-gradient-to-br from-[var(--groups1-primary)] to-purple-600 text-white hover:opacity-90 transition-all shadow-sm hover:shadow-md flex-shrink-0 self-end"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        messageCount={messages.length}
        chatId={selectedChatId || undefined}
      />
    </div>
  );
}
