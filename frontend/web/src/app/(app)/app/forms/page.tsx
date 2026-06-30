"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForms } from "@/hooks/useForms";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiClient } from "@/lib/api-client";
import type { FormItem } from "@/types/forms.types";
import {
  Archive,
  BarChart3,
  Edit,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FeatureGuard } from "@/components/common/FeatureGuard";

const TYPE_LABELS: Record<string, string> = {
  general: "General",
  survey: "Survey",
  quiz: "Quiz",
  attendance: "Attendance",
};

function extractRichText(node: any): string {
  if (!node) return "";
  if (Array.isArray(node)) {
    return node.map(extractRichText).join("");
  }
  if (node.type === "text") {
    return node.text ?? "";
  }
  if (node.type === "hardBreak") {
    return "\n";
  }

  const childText = extractRichText(node.content);
  if (["paragraph", "heading", "blockquote", "listItem"].includes(node.type)) {
    return `${childText}\n`;
  }
  return childText;
}

function getDescriptionPreview(raw?: string | null): string {
  if (!raw?.trim()) return "";

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === "doc") {
      return extractRichText(parsed)
        .replace(/\s*\n\s*/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
    }
  } catch {
    // not JSON, treat as plain text
  }

  return raw.replace(/\s{2,}/g, " ").trim();
}

function FormsPageContent() {
  const router = useRouter();
  usePageTitle("Forms");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft" | "archived">("all");

  const { data: forms = [], isLoading, isValidating, error, mutate: mutateForms } = useForms({});

  const filteredForms = useMemo(() => {
    let list = forms;
    if (activeTab !== "all") {
      list = list.filter((f) => (f.status as string) === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          getDescriptionPreview(f.description).toLowerCase().includes(q)
      );
    }
    return list;
  }, [forms, activeTab, searchQuery]);

  const counts = useMemo(() => ({
    all: forms.length,
    published: forms.filter((f) => (f.status as string) === "published").length,
    draft: forms.filter((f) => (f.status as string) === "draft").length,
    archived: forms.filter((f) => (f.status as string) === "archived").length,
  }), [forms]);

  const handleEdit = (form: FormItem) => router.push(`/app/forms/${form.id}/builder`);
  const handleNewForm = () => router.push("/app/forms/builder");
  const handleViewAnalytics = (form: FormItem) => router.push(`/app/forms/${form.id}/analytics`);

  const handlePublish = async (form: FormItem) => {
    try {
      await apiClient.publishForm(form.id);
      toast.success("Form published");
      await mutateForms();
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish form");
    }
  };

  const handleArchive = async (form: FormItem) => {
    try {
      await apiClient.archiveForm(form.id);
      toast.success("Form archived");
      await mutateForms();
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive form");
    }
  };

  const handleRefresh = async () => {
    await mutateForms();
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Forms</h1>
        <Card variant="groups1">
          <CardContent variant="groups1" className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : "Failed to load forms"}
            </p>
            <Button
              onClick={() => mutateForms()}
              className="mt-4 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] hover:text-[var(--groups1-text)]"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md md:max-w-none space-y-4 md:space-y-6 pb-24 md:pb-0">

      {/* ── Mobile Header ── */}
      <div className="md:hidden px-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--groups1-text)] leading-tight">Forms</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
                disabled={isLoading || isValidating}
              >
                <RefreshCw className={cn("w-4 h-4", (isLoading || isValidating) && "animate-spin")} />
              </Button>
            </div>
            <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
              Create and manage forms for data collection.
            </p>
          </div>
        </div>
        <Button
          onClick={handleNewForm}
          className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* ── Desktop Header ── */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--groups1-text)]">Forms</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
              disabled={isLoading || isValidating}
            >
              <RefreshCw className={cn("w-4 h-4", (isLoading || isValidating) && "animate-spin")} />
            </Button>
          </div>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Create and manage forms for student data collection and surveys
          </p>
        </div>
        <Button
          onClick={handleNewForm}
          className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Form
        </Button>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--groups1-text-secondary)]" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search forms by title..."
          className="pl-9 bg-[var(--groups1-surface)]"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 overflow-x-auto border-b border-[var(--groups1-border)] pb-2">
        {(["all", "published", "draft", "archived"] as const).map((tab) => (
          <Button
            key={tab}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-full capitalize",
              activeTab === tab
                ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-transparent hover:bg-[var(--groups1-primary-hover)]"
                : "bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            )}
          >
            {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab]})
          </Button>
        ))}
      </div>

      {/* ── Forms Table / Cards ── */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>
            {isLoading
              ? `${activeTab === "all" ? "All" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Forms`
              : `${activeTab === "all" ? "All" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Forms (${filteredForms.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="pb-6">
          {isLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--groups1-text-secondary)]" />
              <p className="mt-2 text-sm text-[var(--groups1-text-secondary)]">Loading forms...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--groups1-text-secondary)]">No forms found.</p>
              <Button onClick={handleNewForm} variant="link" className="mt-2">
                Create the first form
              </Button>
            </div>
          ) : (
            <>
              {/* ── Mobile Cards ── */}
              <div className="md:hidden space-y-3">
                {filteredForms.map((form) => {
                  const formStatus = (form.status as string) || "draft";
                  return (
                    <div
                      key={form.id}
                      className="rounded-2xl border border-[var(--groups1-border)] bg-[var(--groups1-surface)] overflow-hidden"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-[var(--groups1-text)] truncate">
                              {form.title}
                            </p>
                            {getDescriptionPreview(form.description) && (
                              <p className="mt-0.5 text-xs text-[var(--groups1-text-secondary)] truncate">
                                {getDescriptionPreview(form.description)}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] px-2 py-1 rounded-md font-semibold uppercase tracking-wide shrink-0">
                            {TYPE_LABELS[form.type] || form.type}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)]">Status</div>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                              style={{
                                backgroundColor: formStatus === "published"
                                  ? "hsl(var(--groups1-primary) / 0.12)"
                                  : "hsl(var(--groups1-border))",
                                color: formStatus === "published"
                                  ? "hsl(var(--groups1-primary))"
                                  : "hsl(var(--groups1-text-secondary))",
                              }}
                            >
                              {formStatus}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--groups1-text-secondary)]">Responses</div>
                            <div className="text-[13px] font-semibold text-[var(--groups1-text)]">
                              {(form as any).responseCount ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[var(--groups1-background)] border-t border-[var(--groups1-border)] px-4 py-3 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9"
                          onClick={() => handleEdit(form)}
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9"
                          onClick={() => handleViewAnalytics(form)}
                        >
                          <BarChart3 className="w-4 h-4 mr-1.5" />
                          Analytics
                        </Button>
                        {formStatus !== "published" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9 text-[var(--groups1-primary)] border-[var(--groups1-primary)]"
                            onClick={() => handlePublish(form)}
                          >
                            <Rocket className="w-4 h-4 mr-1.5" />
                            Publish
                          </Button>
                        )}
                        {formStatus === "published" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-10 p-0 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleArchive(form)}
                            aria-label="Archive form"
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
                        {formStatus === "published" && (form as any).slug && (
                          <a href={`/forms/${(form as any).slug}`} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="h-9 w-10 p-0" aria-label="Open public link">
                              <Link2 className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop Table ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--groups1-card-border-inner)]">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">Responses</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">Targeting</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--groups1-text-secondary)] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredForms.map((form) => {
                      const formStatus = (form.status as string) || "draft";
                      return (
                        <tr key={form.id} className="hover:bg-[var(--groups1-secondary)]">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-[var(--groups1-text)]">{form.title}</p>
                            {getDescriptionPreview(form.description) && (
                              <p className="text-xs text-[var(--groups1-text-secondary)] truncate max-w-xs">{getDescriptionPreview(form.description)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text-secondary)] whitespace-nowrap">
                            {TYPE_LABELS[form.type] || form.type}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: formStatus === "published"
                                  ? "hsl(var(--groups1-primary) / 0.12)"
                                  : "hsl(var(--groups1-border))",
                                color: formStatus === "published"
                                  ? "hsl(var(--groups1-primary))"
                                  : "hsl(var(--groups1-text-secondary))",
                              }}
                            >
                              {formStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text)] whitespace-nowrap">
                            {(form as any).responseCount ?? 0}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--groups1-text-secondary)]">
                            {form.courseName || form.batchName || form.moduleName ? (
                              <div className="flex flex-wrap gap-1">
                                {form.moduleName && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)]">
                                    {form.moduleName}
                                  </span>
                                )}
                                {form.courseName && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)]">
                                    {form.courseName}
                                  </span>
                                )}
                                {form.batchName && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--groups1-secondary)] text-[var(--groups1-text-secondary)] border border-[var(--groups1-border)]">
                                    {form.batchName}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[var(--groups1-text-secondary)]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleEdit(form)}
                                aria-label="Edit form"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleViewAnalytics(form)}
                                aria-label="View analytics"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                              {formStatus !== "published" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePublish(form)}
                                  className="text-[var(--groups1-primary)] border-[var(--groups1-primary)] hover:bg-[var(--groups1-primary)] hover:text-[var(--groups1-btn-primary-text)]"
                                >
                                  <Rocket className="w-4 h-4 mr-1.5" />
                                  Publish
                                </Button>
                              )}
                              {formStatus === "published" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleArchive(form)}
                                  className="text-orange-600 border-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950"
                                >
                                  <Archive className="w-4 h-4 mr-1.5" />
                                  Archive
                                </Button>
                              )}
                              {formStatus === "published" && (form as any).slug && (
                                <a href={`/forms/${(form as any).slug}`} target="_blank" rel="noreferrer">
                                  <Button variant="ghost" size="icon-sm" aria-label="Open public link">
                                    <Link2 className="w-4 h-4" />
                                  </Button>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function FormsPage() {
  return (
    <FeatureGuard feature="forms">
      <FormsPageContent />
    </FeatureGuard>
  );
}
