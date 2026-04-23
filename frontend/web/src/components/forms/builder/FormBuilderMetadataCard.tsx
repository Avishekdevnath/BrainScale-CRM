"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TypeOption = {
  value: string;
  label: string;
};

type CourseOption = { id: string; name: string; isActive: boolean };
type ModuleOption = { id: string; name: string; isActive: boolean; course?: { id: string; name: string } };
type BatchOption = { id: string; name: string; isActive: boolean };

type FormBuilderMetadataCardProps = {
  open: boolean;
  type: string;
  slug: string;
  slugStatus?: "idle" | "checking" | "available" | "taken";
  typeOptions: TypeOption[];
  moduleName: string;
  courseName: string;
  batchName: string;
  courses: CourseOption[];
  allModules: ModuleOption[];
  batches: BatchOption[];
  coursesLoading?: boolean;
  modulesLoading?: boolean;
  batchesLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onTypeChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onModuleNameChange: (value: string) => void;
  onCourseNameChange: (value: string) => void;
  onBatchNameChange: (value: string) => void;
};

type SelectOption = {
  value: string;
  label: string;
};

function withFallbackOption(options: SelectOption[], currentValue: string): SelectOption[] {
  const trimmedValue = currentValue.trim();
  if (!trimmedValue) return options;
  if (options.some((option) => option.value === trimmedValue)) return options;
  return [{ value: trimmedValue, label: `${trimmedValue} (saved)` }, ...options];
}

const selectStyle: React.CSSProperties = {
  borderColor: `var(--groups1-border)`,
  backgroundColor: `var(--groups1-surface)`,
  color: `var(--groups1-text)`,
};

export function FormBuilderMetadataCard({
  open,
  type,
  slug,
  slugStatus = "idle",
  typeOptions,
  moduleName,
  courseName,
  batchName,
  courses,
  allModules,
  batches,
  coursesLoading = false,
  modulesLoading = false,
  batchesLoading = false,
  onOpenChange,
  onTypeChange,
  onSlugChange,
  onModuleNameChange,
  onCourseNameChange,
  onBatchNameChange,
}: FormBuilderMetadataCardProps) {

  const selectedCourseName = courseName.trim();
  const visibleModules = selectedCourseName
    ? allModules.filter((module) => module.course?.name === selectedCourseName)
    : allModules;

  const courseOptions = withFallbackOption(
    courses.map((c) => ({ value: c.name, label: c.isActive ? c.name : `${c.name} (inactive)` })),
    courseName
  );
  const moduleOptions = withFallbackOption(
    visibleModules.map((m) => ({
      value: m.name,
      label: m.course?.name
        ? `${m.name}${m.isActive ? "" : " (inactive)"} (${m.course.name})`
        : `${m.name}${m.isActive ? "" : " (inactive)"}`,
    })),
    moduleName
  );
  const batchOptions = withFallbackOption(
    batches.map((b) => ({ value: b.name, label: b.isActive ? b.name : `${b.name} (inactive)` })),
    batchName
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl rounded-[28px] p-0"
        style={{
          borderColor: `var(--groups1-border)`,
          backgroundColor: `var(--groups1-surface)`,
        }}
      >
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader
          className="border-b px-6 pt-6"
          style={{ borderColor: `var(--groups1-border)` }}
        >
          <DialogTitle className="text-xl font-semibold text-[var(--groups1-text)]">Form settings</DialogTitle>
          <p className="text-sm text-[var(--groups1-text-secondary)]">Type, slug, module, course, and batch metadata</p>
        </DialogHeader>
        <div className="grid gap-4 px-6 pb-6 pt-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="form-builder-type">Form type</Label>
            <select
              id="form-builder-type"
              value={type}
              onChange={(e) => onTypeChange(e.target.value)}
              className="flex h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none transition"
              style={selectStyle}
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="form-builder-slug">Form slug</Label>
              {slugStatus === "checking" && (
                <span className="text-xs text-[var(--groups1-text-secondary)]">Checking…</span>
              )}
              {slugStatus === "available" && (
                <span className="text-xs font-medium text-emerald-600">Available</span>
              )}
              {slugStatus === "taken" && (
                <span className="text-xs font-medium text-rose-600">Already taken</span>
              )}
            </div>
            <Input
              id="form-builder-slug"
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="public-form-slug"
              className="h-11 rounded-xl"
              style={{
                ...selectStyle,
                ...(slugStatus === "taken" ? { borderColor: "rgb(225 29 72)" } : {}),
                ...(slugStatus === "available" ? { borderColor: "rgb(5 150 105)" } : {}),
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-builder-module">Module</Label>
            <select
              id="form-builder-module"
              value={moduleName}
              onChange={(e) => {
                const nextModuleName = e.target.value;
                const selectedModule = allModules.find((m) => m.name === nextModuleName);
                onModuleNameChange(nextModuleName);
                if (selectedModule?.course?.name) onCourseNameChange(selectedModule.course.name);
              }}
              className="flex h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none transition"
              style={selectStyle}
            >
              <option value="">{modulesLoading ? "Loading modules..." : "Select module"}</option>
              {moduleOptions.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-builder-course">Course</Label>
            <select
              id="form-builder-course"
              value={courseName}
              onChange={(e) => onCourseNameChange(e.target.value)}
              className="flex h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none transition"
              style={selectStyle}
            >
              <option value="">{coursesLoading ? "Loading courses..." : "Select course"}</option>
              {courseOptions.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="form-builder-batch">Batch</Label>
            <select
              id="form-builder-batch"
              value={batchName}
              onChange={(e) => onBatchNameChange(e.target.value)}
              className="flex h-11 w-full rounded-xl border px-3 py-2 text-sm outline-none transition"
              style={selectStyle}
            >
              <option value="">{batchesLoading ? "Loading batches..." : "Select batch"}</option>
              {batchOptions.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div
          className="flex justify-end border-t px-6 py-4"
          style={{ borderColor: `var(--groups1-border)` }}
        >
          <Button
            variant="outline"
            className="rounded-full cursor-pointer"
            style={{ borderColor: `var(--groups1-border)`, color: `var(--groups1-text)` }}
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
