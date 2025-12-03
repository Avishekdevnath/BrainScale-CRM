"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GroupDragDropProps {
  children: React.ReactNode;
  groupId: string;
  onDrop?: (groupId: string, targetBatchId: string | null) => void;
  className?: string;
}

export function GroupDragDrop({ children, groupId, onDrop, className }: GroupDragDropProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", groupId);
    e.dataTransfer.setData("application/json", JSON.stringify({ groupId, type: "group" }));
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setIsDragging(false);

    const data = e.dataTransfer.getData("application/json");
    if (data) {
      try {
        const { groupId: draggedGroupId } = JSON.parse(data);
        if (draggedGroupId && onDrop) {
          // Extract batchId from drop target if available
          const targetBatchId = (e.currentTarget as HTMLElement)?.dataset?.batchId || null;
          onDrop(draggedGroupId, targetBatchId);
        }
      } catch (error) {
        console.error("Failed to parse drag data:", error);
      }
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "cursor-move transition-opacity",
        isDragging && "opacity-50",
        dragOver && "ring-2 ring-[var(--groups1-primary)]",
        className
      )}
    >
      {children}
    </div>
  );
}

