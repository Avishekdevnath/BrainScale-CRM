"use client";

import { ArrowLeft, Eye, Rocket, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type FormBuilderTopbarProps = {
  title: string;
  isEdit: boolean;
  isBusy: boolean;
  status: "idle" | "saving" | "saved" | "publishing";
  onBack: () => void;
  onSave: () => void;
  onPublish: () => void;
  onOpenSettings: () => void;
  onPreview: () => void;
};

function getStatusLabel(status: FormBuilderTopbarProps["status"]): string {
  switch (status) {
    case "saving":
      return "Saving draft";
    case "saved":
      return "All changes saved";
    case "publishing":
      return "Publishing";
    default:
      return "Draft editing";
  }
}

export function FormBuilderTopbar({
  title,
  isEdit,
  isBusy,
  status,
  onBack,
  onSave,
  onPublish,
  onOpenSettings,
  onPreview,
}: FormBuilderTopbarProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-xl"
      style={{
        borderColor: `var(--groups1-border)`,
        backgroundColor: `hsl(var(--groups1-surface) / 0.92)`,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <Button
          variant="ghost"
          className="shrink-0 rounded-full cursor-pointer"
          onClick={onBack}
          style={{ color: `var(--groups1-text)` }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--groups1-text)]">
            {title.trim() || (isEdit ? "Untitled form" : "New form")}
          </div>
          <div className="text-xs text-[var(--groups1-text-secondary)]">{getStatusLabel(status)}</div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full cursor-pointer text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
            onClick={onPreview}
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">Preview form</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full cursor-pointer text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
            onClick={onOpenSettings}
          >
            <Settings2 className="h-4 w-4" />
            <span className="sr-only">Open form settings</span>
          </Button>
          <Button
            variant="outline"
            className="rounded-full cursor-pointer"
            style={{
              borderColor: `var(--groups1-border)`,
              color: `var(--groups1-text)`,
              backgroundColor: `var(--groups1-surface)`,
            }}
            onClick={onSave}
            disabled={isBusy}
          >
            <Save className="mr-2 h-4 w-4" />
            {status === "saving" ? "Saving..." : "Save draft"}
          </Button>
          <Button
            className="rounded-full cursor-pointer"
            style={{
              backgroundColor: `hsl(var(--groups1-primary))`,
              color: `hsl(var(--groups1-btn-primary-text))`,
            }}
            onClick={onPublish}
            disabled={isBusy}
          >
            <Rocket className="mr-2 h-4 w-4" />
            {status === "publishing" ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>
    </header>
  );
}
