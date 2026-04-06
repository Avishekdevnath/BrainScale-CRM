"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FormItem } from "@/types/forms.types";
import { Archive, BarChart3, Edit, Eye, Link2, Rocket } from "lucide-react";

type Props = {
  forms: FormItem[];
  onEdit: (form: FormItem) => void;
  onPublish: (form: FormItem) => Promise<void> | void;
  onArchive: (form: FormItem) => Promise<void> | void;
  onViewResponses: (form: FormItem) => void;
};

const TYPE_CONFIG: Record<string, { emoji: string }> = {
  general: { emoji: "📝" },
  survey: { emoji: "📊" },
  quiz: { emoji: "🎯" },
  attendance: { emoji: "✅" },
};

export function FormsList({ forms, onEdit, onPublish, onArchive, onViewResponses }: Props) {
  if (!forms.length) {
    return (
      <Card variant="groups1" className="border-dashed border-2">
        <CardContent variant="groups1" className="py-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium mb-1" style={{color: `hsl(var(--groups1-text))`}}>No forms yet</p>
          <p className="text-sm" style={{color: `hsl(var(--groups1-text-secondary))`}}>Create your first form to start collecting responses.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {forms.map((form) => {
        const typeConfig = TYPE_CONFIG[form.type] || TYPE_CONFIG.general;
        const formStatus = (form.status as string) || "draft";

        return (
          <Card
            key={form.id}
            variant="groups1"
            className="border hover:shadow-lg transition-all duration-300 group overflow-hidden"
            style={{borderColor: `hsl(var(--groups1-border))`}}
          >
            <div
              style={{
                height: '4px',
                backgroundColor: formStatus === "published"
                  ? `hsl(var(--groups1-primary))`
                  : formStatus === "archived"
                  ? `hsl(var(--groups1-text-secondary) / 0.5)`
                  : `hsl(var(--groups1-primary) / 0.6)`
              }}
            />

            <CardContent variant="groups1" className="p-4">
              <div className="flex items-start gap-4 justify-between">
                {/* Left: Form info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl flex-shrink-0">{typeConfig.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate text-base" style={{color: `hsl(var(--groups1-text))`}}>{form.title}</h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                          backgroundColor: formStatus === "published"
                            ? `hsl(var(--groups1-primary) / 0.15)`
                            : formStatus === "archived"
                            ? `hsl(var(--groups1-text-secondary) / 0.1)`
                            : `hsl(var(--groups1-border))`,
                          color: formStatus === "published"
                            ? `hsl(var(--groups1-primary))`
                            : `hsl(var(--groups1-text-secondary))`
                        }}>
                          {formStatus}
                        </span>
                      </div>
                      {form.description && (
                        <p className="text-sm line-clamp-1 mb-2" style={{color: `hsl(var(--groups1-text-secondary))`}}>{form.description}</p>
                      )}

                      {/* Targeting info */}
                      {(form.moduleName || form.courseName || form.batchName) && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {form.moduleName && (
                            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded" style={{
                              backgroundColor: `hsl(var(--groups1-primary) / 0.1)`,
                              color: `hsl(var(--groups1-primary))`
                            }}>
                              📦 {form.moduleName}
                            </span>
                          )}
                          {form.courseName && (
                            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded" style={{
                              backgroundColor: `hsl(var(--groups1-border))`,
                              color: `hsl(var(--groups1-text-secondary))`
                            }}>
                              📚 {form.courseName}
                            </span>
                          )}
                          {form.batchName && (
                            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded" style={{
                              backgroundColor: `hsl(var(--groups1-border))`,
                              color: `hsl(var(--groups1-text-secondary))`
                            }}>
                              📅 {form.batchName}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Response count */}
                      <div className="text-xs" style={{color: `hsl(var(--groups1-text-secondary))`}}>
                        <span className="inline-flex items-center gap-1">
                          📊 {(form as any).responseCount ?? 0} {(form as any).responseCount === 1 ? "response" : "responses"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(form)}
                    title="Edit form"
                    className="h-8 px-2"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewResponses(form)}
                    title="View responses"
                    className="h-8 px-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>

                  {formStatus === "published" ? (
                    <>
                      {(form as any).slug && (
                        <a href={`/forms/${(form as any).slug}`} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" title="Open public link" className="h-8 px-2">
                            <Link2 className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onArchive(form)}
                        title="Archive form"
                        className="h-8 px-2"
                        style={{color: `hsl(var(--danger))`}}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPublish(form)}
                      title="Publish form"
                      className="h-8 px-2"
                      style={{color: `hsl(var(--groups1-primary))`}}
                    >
                      <Rocket className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
