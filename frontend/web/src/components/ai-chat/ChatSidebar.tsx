"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, Edit2, Check, X, MessageSquare, Menu, LogOut, Plus } from "lucide-react";
import { Chat } from "@/types/ai-chat.types";
import { Input } from "@/components/ui/input";
import { useChatStore } from "@/store/chat";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useLogout } from "@/hooks/useLogout";
import { useWorkspaceStore } from "@/store/workspace";

export function ChatSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { chats, selectedChatId, setChats, setSelectedChatId, addChat, updateChat, removeChat } = useChatStore();
  const workspaceName = useWorkspaceStore((state) => state.getCurrentName());
  const logout = useLogout();

  // Load chats on mount (only once)
  useEffect(() => {
    const loadChats = async () => {
      try {
        setIsLoading(true);
        const chatsList = await apiClient.getChats();
        setChats(chatsList);
        
        // Select first chat if none selected and chats exist
        if (!selectedChatId && chatsList.length > 0) {
          setSelectedChatId(chatsList[0].id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load chats";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleStartEdit = (chat: Chat) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title || "New Chat");
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditTitle("");
  };

  const handleSaveEdit = async (chatId: string) => {
    if (editTitle.trim()) {
      try {
        const updatedChat = await apiClient.updateChat(chatId, editTitle.trim());
        updateChat(chatId, updatedChat);
        toast.success("Chat title updated");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update chat title";
        toast.error(message);
      }
    }
    setEditingChatId(null);
    setEditTitle("");
  };

  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat? This will delete all messages in this chat.")) {
      try {
        await apiClient.deleteChat(chatId);
        removeChat(chatId);
        toast.success("Chat deleted");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete chat";
        toast.error(message);
      }
    }
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleNewChat = async () => {
    try {
      const newChat = await apiClient.createChat();
      addChat(newChat);
      setSelectedChatId(newChat.id);
      toast.success("New chat created");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create chat";
      toast.error(message);
    }
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-[var(--groups1-surface)] border-[var(--groups1-border)] transition-all duration-250 h-screen",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[var(--groups1-border)] flex-shrink-0">
        <Link
          href="/app"
          className="flex items-center gap-3 transition-all hover:brightness-95"
        >
          <Image
            src="/assets/logo.png"
            alt="BrainScale CRM"
            width={32}
            height={32}
            className="flex-shrink-0 w-8 h-8 object-contain"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <div className="text-base font-bold text-[var(--groups1-text)] truncate">
                BrainScale CRM
              </div>
              <div className="text-xs text-[var(--groups1-text-secondary)] truncate">
                {workspaceName}
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* New Chat Button */}
      <div className="p-2 border-b border-[var(--groups1-border)] flex-shrink-0">
        <Button
          onClick={handleNewChat}
          className={cn(
            "w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary)] hover:opacity-90 gap-2",
            collapsed && "px-2"
          )}
          size="sm"
          title={collapsed ? "New Chat" : undefined}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </Button>
      </div>

      {/* Chat list */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-[var(--groups1-text-secondary)]">
            Loading chats...
          </div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-sm text-[var(--groups1-text-secondary)]">
            {!collapsed && "No chats yet. Create a new chat to get started."}
          </div>
        ) : (
          <>
            {chats.map((chat) => {
              const isSelected = chat.id === selectedChatId;
              const isEditing = editingChatId === chat.id;
              const displayTitle = chat.title || "New Chat";

              return (
                <div
                  key={chat.id}
                  className={cn(
                    "group relative mb-1 rounded-lg p-2 cursor-pointer transition-colors",
                    isSelected
                      ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
                      : "hover:bg-[var(--groups1-secondary)] text-[var(--groups1-text)]"
                  )}
                  onClick={() => !isEditing && handleChatSelect(chat.id)}
                  title={collapsed ? displayTitle : undefined}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveEdit(chat.id);
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                        className="h-7 text-sm bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)]"
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveEdit(chat.id);
                        }}
                        className="h-7 w-7"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        className="h-7 w-7"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{displayTitle}</div>
                            {chat._count?.messages !== undefined && (
                              <div
                                className={cn(
                                  "text-xs mt-0.5",
                                  isSelected
                                    ? "text-[var(--groups1-btn-primary-text)] opacity-70"
                                    : "text-[var(--groups1-text-secondary)]"
                                )}
                              >
                                {chat._count.messages} messages
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(chat);
                              }}
                              className={cn(
                                "h-6 w-6",
                                isSelected
                                  ? "text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-btn-primary-text)] hover:bg-opacity-20"
                                  : ""
                              )}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={(e) => handleDelete(chat.id, e)}
                              className={cn(
                                "h-6 w-6",
                                isSelected
                                  ? "text-[var(--groups1-btn-primary-text)] hover:bg-red-500 hover:bg-opacity-20"
                                  : "text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/20"
                              )}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Utility Section */}
      <div className="p-2 border-t border-[var(--groups1-border)] space-y-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all",
            "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
          )}
          title={collapsed ? "Expand" : "Collapse"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          type="button"
          onClick={logout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all",
            "text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

