"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import "./chat-scrollbar.css";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import { Loader2, Send, Trash2, Bot, User, Search, Download, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { TypingIndicator } from "@/components/ai-chat/TypingIndicator";
import { MessageActions } from "@/components/ai-chat/MessageActions";
import { ExportDialog } from "@/components/ai-chat/ExportDialog";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday, isThisWeek, differenceInDays } from "date-fns";
import type { ChatMessage } from "@/types/ai-chat.types";
import { useChatStore } from "@/store/chat";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
      // Use setTimeout to ensure DOM is updated
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
    return messages.filter(
      (msg) => msg.content.toLowerCase().includes(query)
    );
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
        label = format(date, "EEEE"); // Day name
      } else if (differenceInDays(new Date(), date) < 7) {
        label = format(date, "EEEE"); // Day name
      } else {
        label = format(date, "MMMM d, yyyy");
      }

      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = {
          date: format(date, "yyyy-MM-dd"),
          label,
          messages: [],
        };
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
    setIsLoading(true);
    setError(null);

    // If no chat selected, create one first
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

    // Optimistically add user message
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
    
    // Scroll to bottom immediately after adding user message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    try {
      const response = await apiClient.sendChatMessage(userMessageText, currentChatId);
      
      // Update selectedChatId if a new chat was created
      if (response.chatId !== currentChatId) {
        setSelectedChatId(response.chatId);
        // Reload chats to get the new one
        const chatsList = await apiClient.getChats();
        setChats(chatsList);
      }
      
      // Replace temp message with real user message and add assistant message
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempUserMessage.id);
        return [...filtered, response.userMessage, response.assistantMessage];
      });

      // Update chats list to reflect updated chat
      const chatsList = await apiClient.getChats();
      setChats(chatsList);

      // Scroll to bottom after assistant message is added
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      // Focus input after sending
      inputRef.current?.focus();
    } catch (err) {
      // Remove temp message on error
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

    if (!confirm("Are you sure you want to clear all messages in this chat? This cannot be undone.")) {
      return;
    }

    try {
      await apiClient.clearChatHistory(selectedChatId);
      setMessages([]);
      setSearchQuery("");
      toast.success("Chat history cleared");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to clear chat history";
      toast.error(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return format(date, "MMM d, h:mm a");
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
          <div>
            <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">AI Chat</h1>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Ask questions about your workspace data and get AI-powered insights
            </p>
          </div>
        </div>
        <Card variant="groups1" className="flex-1 flex flex-col min-h-0">
          <CardContent variant="groups1" className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--groups1-text-secondary)]" />
              <p className="text-sm text-[var(--groups1-text-secondary)]">
                Loading chat history...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 pb-6">
        <div className="flex items-center justify-between mb-4">
          {/* Chat name and summary on left */}
          {(() => {
            const selectedChat = selectedChatId ? chats.find(c => c.id === selectedChatId) : null;
            
            // Use title if available, otherwise use summary (first message), otherwise default
            const chatName = selectedChat?.title 
              ? selectedChat.title
              : selectedChat?.summary
                ? (selectedChat.summary.length > 50 
                    ? selectedChat.summary.substring(0, 47) + '...' 
                    : selectedChat.summary)
                : selectedChatId
                  ? "New Chat"
                  : null;
            
            // Summary is only shown if different from the name (when title exists)
            const chatSummary = selectedChat?.title && selectedChat?.summary
              ? (selectedChat.summary.length > 60
                  ? selectedChat.summary.substring(0, 57) + '...'
                  : selectedChat.summary)
              : null;
            
            if (!chatName) return null;
            
            return (
              <div className="flex flex-col min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">
                  {chatName}
                </h1>
                {chatSummary && (
                  <p className="text-sm text-[var(--groups1-text-secondary)]">
                    {chatSummary}
                  </p>
                )}
              </div>
            );
          })()}
          
          {/* Export/Clear buttons on right */}
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
                  onClick={handleClearHistory}
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

      {/* Chat Container - Takes remaining space */}
      <Card variant="groups1" className="flex-1 flex flex-col min-h-0 overflow-hidden shadow-lg">
        {/* Messages Area - Scrollable */}
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
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Bot className="w-16 h-16 text-[var(--groups1-text-secondary)] mb-4" />
              </motion.div>
              <h3 className="text-lg font-semibold text-[var(--groups1-text)] mb-2">
                {searchQuery ? "No messages found" : "Start a conversation"}
              </h3>
              <p className="text-sm text-[var(--groups1-text-secondary)] max-w-md mb-6">
                {searchQuery
                  ? "Try a different search query"
                  : "Ask me anything about your workspace. I can help you find students, analyze call logs, get statistics, and more!"}
              </p>
              {!searchQuery && (
                <div className="space-y-2 text-left">
                  <p className="text-xs text-[var(--groups1-text-secondary)] font-medium">Try asking:</p>
                  <ul className="text-xs text-[var(--groups1-text-secondary)] space-y-1 list-disc list-inside">
                    <li>"Show me students who haven't been called in the last week"</li>
                    <li>"What are my workspace statistics?"</li>
                    <li>"Find call logs for John Doe"</li>
                    <li>"What follow-ups are due today?"</li>
                  </ul>
                </div>
              )}
            </motion.div>
          ) : (
            <>
              <AnimatePresence>
                {groupedMessages.map((group, groupIndex) => (
                  <div key={group.date} className="space-y-4">
                    {/* Date separator */}
                    <div className="flex items-center gap-4 my-4">
                      <div className="flex-1 h-px bg-[var(--groups1-border)]" />
                      <span className="text-xs font-medium text-[var(--groups1-text-secondary)] px-2">
                        {group.label}
                      </span>
                      <div className="flex-1 h-px bg-[var(--groups1-border)]" />
                    </div>
                    {/* Messages in group */}
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
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--groups1-primary)] flex items-center justify-center shadow-sm">
                            <Bot className="w-4 h-4 text-[var(--groups1-btn-primary-text)]" />
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
                              {formatTime(message.createdAt)}
                            </div>
                            <MessageActions
                              messageId={message.id}
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

        {/* Input Area - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-[var(--groups1-border)] p-4 bg-[var(--groups1-background)] z-10">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </motion.div>
          )}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-[var(--groups1-background)] border-[var(--groups1-border)] text-[var(--groups1-text)] focus:ring-2 focus:ring-[var(--groups1-focus-ring)] transition-all"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary)] hover:opacity-90 transition-all shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        messageCount={messages.length}
        chatId={selectedChatId || undefined}
      />
    </div>
  );
}
