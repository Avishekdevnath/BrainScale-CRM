"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MessagesBuilderProps {
  messages: string[];
  onChange: (messages: string[]) => void;
  disabled?: boolean;
}

export function MessagesBuilder({ messages, onChange, disabled }: MessagesBuilderProps) {
  const addMessage = () => {
    onChange([...messages, ""]);
  };

  const removeMessage = (index: number) => {
    onChange(messages.filter((_, i) => i !== index));
  };

  const updateMessage = (index: number, value: string) => {
    const updated = [...messages];
    updated[index] = value;
    onChange(updated);
  };

  const moveMessage = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === messages.length - 1) return;

    const updated = [...messages];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-[var(--groups1-text)]">
          Messages to Convey
          <span className="text-gray-400 text-xs font-normal ml-1">(Optional)</span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMessage}
          disabled={disabled}
          className="h-8 bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Message
        </Button>
      </div>

      {messages.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No messages added yet</p>
      ) : (
        <div className="space-y-2">
          {messages.map((message, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex flex-col gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => moveMessage(index, "up")}
                  disabled={disabled || index === 0}
                  className={cn(
                    "p-0.5 rounded hover:bg-[var(--groups1-secondary)] disabled:opacity-30 disabled:cursor-not-allowed",
                    index === 0 && "opacity-30"
                  )}
                >
                  <GripVertical className="w-4 h-4 text-[var(--groups1-text)] rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => moveMessage(index, "down")}
                  disabled={disabled || index === messages.length - 1}
                  className={cn(
                    "p-0.5 rounded hover:bg-[var(--groups1-secondary)] disabled:opacity-30 disabled:cursor-not-allowed",
                    index === messages.length - 1 && "opacity-30"
                  )}
                >
                  <GripVertical className="w-4 h-4 text-[var(--groups1-text)] -rotate-90" />
                </button>
              </div>
              <div className="flex-1">
                <textarea
                  value={message}
                  onChange={(e) => updateMessage(index, e.target.value)}
                  placeholder={`Message ${index + 1}...`}
                  className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y"
                  disabled={disabled}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeMessage(index)}
                disabled={disabled}
                className="mt-2 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

