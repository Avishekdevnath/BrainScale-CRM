"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useChatStore } from "@/store/chat";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export function useChatInitializer() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedChatId, setSelectedChatId, setChats, hydrate } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Load chats on mount
    const loadChats = async () => {
      try {
        setIsLoading(true);
        const chatsList = await apiClient.getChats();
        setChats(chatsList);

        // If we have a selected chat ID, verify it still exists
        if (selectedChatId) {
          const chatExists = chatsList.find((c) => c.id === selectedChatId);
          if (!chatExists && chatsList.length > 0) {
            // Selected chat no longer exists, select first chat
            setSelectedChatId(chatsList[0].id);
          } else if (!chatExists) {
            // No chats available
            setSelectedChatId(null);
          }
        } else if (chatsList.length > 0 && !hasInitialized.current) {
          // No chat selected, select first chat
          setSelectedChatId(chatsList[0].id);
        }

        hasInitialized.current = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load chats";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    // Only load if we're on a chat route
    if (pathname?.startsWith("/app/ai-chat")) {
      void loadChats();
    }
  }, [pathname, selectedChatId, setChats, setSelectedChatId]);

  return {
    isLoading,
    selectedChatId,
  };
}

