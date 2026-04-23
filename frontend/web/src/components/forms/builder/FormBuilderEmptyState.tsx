"use client";

import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function FormBuilderEmptyState() {
  return (
    <Card
      variant="groups1"
      className="rounded-[24px] border-dashed"
      style={{ borderColor: `var(--groups1-border)` }}
    >
      <CardContent variant="groups1" className="px-6 py-14 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `hsl(var(--groups1-primary) / 0.1)`,
            color: `hsl(var(--groups1-primary))`,
          }}
        >
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--groups1-text)]">Start with your first question</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--groups1-text-secondary)]">
          Use the add toolbar to insert a question type, then edit everything inline right inside the canvas.
        </p>
      </CardContent>
    </Card>
  );
}
