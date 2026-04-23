"use client";

import { CirclePlus, LayoutPanelTop, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type FormBuilderAddToolbarProps = {
  onAddQuestion: () => void;
  onAddSection: () => void;
};

export function FormBuilderAddToolbar({
  onAddQuestion,
  onAddSection,
}: FormBuilderAddToolbarProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 pt-2">
      <Button
        type="button"
        variant="outline"
        className="rounded-full px-5 py-5 shadow-sm cursor-pointer"
        style={{
          borderColor: `var(--groups1-border)`,
          backgroundColor: `var(--groups1-surface)`,
          color: `var(--groups1-text)`,
        }}
        onClick={onAddQuestion}
      >
        <CirclePlus className="h-4 w-4" />
        Add question
      </Button>
      <Button
        type="button"
        variant="outline"
        className="rounded-full px-5 py-5 shadow-sm cursor-pointer"
        style={{
          borderColor: `var(--groups1-border)`,
          backgroundColor: `var(--groups1-surface)`,
          color: `var(--groups1-text)`,
        }}
        onClick={onAddSection}
      >
        <LayoutPanelTop className="h-4 w-4" />
        Add section
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="rounded-full cursor-pointer text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
        onClick={onAddQuestion}
      >
        <Plus className="h-4 w-4" />
        New question
      </Button>
    </div>
  );
}
