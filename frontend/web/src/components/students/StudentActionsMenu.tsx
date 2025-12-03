"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import type { Student, StudentDetail, StudentPhoneInput, UpdateStudentPayload } from "@/types/students.types";
import { toast } from "sonner";

interface StudentActionsMenuProps {
  student: Student;
  onChanged?: () => void;
  contextGroupId?: string;
}

interface FormState {
  name: string;
  email: string;
  discordId: string;
  tags: string;
  phones: StudentPhoneInput[];
}

export function StudentActionsMenu({ student, onChanged, contextGroupId }: StudentActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    discordId: "",
    tags: "",
    phones: [],
  });

  useEffect(() => {
    if (!editOpen) {
      return;
    }
    let active = true;
    const load = async () => {
      try {
        setLoadingDetail(true);
        const data = await apiClient.getStudent(student.id);
        console.log("[StudentActionsMenu] student detail", data);
        if (!active) return;
        setDetail(data);
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          discordId: data.discordId ?? "",
          tags: data.tags?.join(", ") ?? "",
          phones:
            data.phones?.map((phone) => ({
              id: phone.id,
              phone: phone.phone,
              isPrimary: !!phone.isPrimary,
            })) ?? [],
        });
      } catch (error) {
        console.error(error);
        toast.error("Failed to load student details");
        setEditOpen(false);
      } finally {
        if (active) {
          setLoadingDetail(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [editOpen, student.id]);

  const enrollmentSummary = useMemo(() => {
    if (!detail?.enrollments?.length) {
      return "No enrollments";
    }
    return detail.enrollments
      .map((enrollment) => {
        const groupName = enrollment.group?.name ?? "Unknown group";
        const status = enrollment.status ? ` – ${enrollment.status}` : "";
        return `${groupName}${status}`;
      })
      .join(", ");
  }, [detail]);

  const currentGroupStatus = useMemo(() => {
    if (!contextGroupId || !detail?.enrollments) return undefined;
    return detail.enrollments.find((enrollment) => enrollment.group?.id === contextGroupId)?.status;
  }, [contextGroupId, detail]);

  const updateFormField = (key: keyof FormState, value: string | StudentPhoneInput[]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updatePhone = (index: number, partial: Partial<StudentPhoneInput>) => {
    setForm((prev) => {
      const next = [...(prev.phones || [])];
      next[index] = { ...next[index], ...partial };
      return { ...prev, phones: next };
    });
  };

  const addPhoneRow = () => {
    setForm((prev) => ({
      ...prev,
      phones: [...(prev.phones || []), { phone: "", isPrimary: prev.phones?.length ? false : true }],
    }));
  };

  const removePhone = (index: number) => {
    setForm((prev) => ({
      ...prev,
      phones: prev.phones?.filter((_, idx) => idx !== index) ?? [],
    }));
  };

  const onSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        discordId: form.discordId.trim() || null,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        phones: (form.phones || [])
          .map((phone) => ({
            id: phone.id,
            phone: phone.phone,
            isPrimary: !!phone.isPrimary,
          }))
          .filter((phone) => phone.phone.trim().length > 0),
      } satisfies UpdateStudentPayload;
      await apiClient.updateStudent(student.id, payload);
      toast.success("Student updated");
      setEditOpen(false);
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update student");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.deleteStudent(student.id);
      toast.success("Student deleted");
      setDeleteOpen(false);
      onChanged?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete student");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Student actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={4}
            className="min-w-[180px] rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-1 shadow-lg"
          >
            <DropdownMenu.Item
              className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-2 text-sm text-[var(--groups1-text)] outline-none hover:bg-[var(--groups1-secondary)]"
              onSelect={(event) => {
                event.preventDefault();
                setEditOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
              View / Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-2 text-sm text-red-600 outline-none hover:bg-red-50"
              onSelect={(event) => {
                event.preventDefault();
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl w-full">
          <DialogClose onClose={() => setEditOpen(false)} />
          <DialogHeader className="items-start text-left space-y-1">
            <DialogTitle className="text-xl font-semibold text-[var(--groups1-text)]">Edit Student</DialogTitle>
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Update contact details, communication channels, and enrollment context.
            </p>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-10 text-center text-sm text-[var(--groups1-text-secondary)]">Loading student...</div>
          ) : (
            <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto pr-2">
              <section className="space-y-4 rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-muted)] p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label
                      htmlFor="student-name"
                      className="block text-left text-xs uppercase text-[var(--groups1-text-secondary)]"
                    >
                      Name
                    </Label>
                    <Input
                      id="student-name"
                      value={form.name}
                      onChange={(event) => updateFormField("name", event.target.value)}
                      placeholder="Enter full name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="block text-left text-xs uppercase text-[var(--groups1-text-secondary)]">
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateFormField("email", event.target.value)}
                      placeholder="email@example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="block text-left text-xs uppercase text-[var(--groups1-text-secondary)]">
                      Discord ID
                    </Label>
                    <Input
                      value={form.discordId}
                      onChange={(event) => updateFormField("discordId", event.target.value)}
                      placeholder="username#1234"
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="block text-left text-xs uppercase text-[var(--groups1-text-secondary)]">
                      Tags
                    </Label>
                    <Input
                      value={form.tags}
                      onChange={(event) => updateFormField("tags", event.target.value)}
                      placeholder="prospect, priority"
                      className="mt-1"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-muted)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--groups1-text)]">Phone Numbers</p>
                    <p className="text-xs text-[var(--groups1-text-secondary)]">
                      Manage primary and backup contacts.
                    </p>
                  </div>
                  <Button size="sm" onClick={addPhoneRow} className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add phone
                  </Button>
                </div>
                <div className="space-y-3">
                  {(form.phones?.length ? form.phones : []).map((phone, index) => (
                    <div
                      key={phone.id ?? index}
                      className="rounded-md border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-3"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <div className="flex-1">
                          <Label className="block text-left text-xs text-[var(--groups1-text-secondary)]">
                            Phone #{index + 1}
                          </Label>
                          <Input
                            value={phone.phone}
                            onChange={(event) => updatePhone(index, { phone: event.target.value })}
                            placeholder="e.g., +1 555-0100"
                            className="mt-1"
                          />
                        </div>
                        <label className="inline-flex items-center gap-2 text-xs text-[var(--groups1-text-secondary)]">
                          <input
                            type="radio"
                            name={`primary-${student.id}`}
                            checked={!!phone.isPrimary}
                            onChange={() => {
                              setForm((prev) => ({
                                ...prev,
                                phones: (prev.phones ?? []).map((p, idx) => ({
                                  ...p,
                                  isPrimary: idx === index,
                                })),
                              }));
                            }}
                          />
                          Primary
                        </label>
                        {form.phones && form.phones.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removePhone(index)}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {!form.phones?.length && (
                    <p className="text-sm text-[var(--groups1-text-secondary)]">No phone numbers yet.</p>
                  )}
                </div>
              </section>

              {detail?.enrollments?.length ? (
                <section className="rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-muted)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--groups1-text)]">Enrollments</p>
                      <p className="text-xs text-[var(--groups1-text-secondary)]">{enrollmentSummary}</p>
                    </div>
                    {currentGroupStatus && (
                      <span className="rounded-full bg-[var(--groups1-secondary)] px-2 py-1 text-xs font-medium text-[var(--groups1-text)]">
                        Current group: {currentGroupStatus}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                    {detail.enrollments.map((enrollment) => {
                      const groupId = enrollment.group?.id;
                      return (
                        <div
                          key={enrollment.id}
                          className="rounded border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-3 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-[var(--groups1-text)]">
                                {enrollment.group?.name ?? "Unknown group"}
                              </p>
                              {enrollment.course?.name && (
                                <p className="text-[var(--groups1-text-secondary)]">
                                  Course: {enrollment.course?.name}
                                </p>
                              )}
                            </div>
                            <span className="rounded-full bg-[var(--groups1-secondary)] px-2 py-0.5 text-[var(--groups1-text)]">
                              {enrollment.status ?? "N/A"}
                            </span>
                          </div>
                          {groupId && (
                            <Link
                              href={`/app/groups/${groupId}/students`}
                              className="mt-2 inline-flex items-center text-[var(--groups1-primary)] hover:underline"
                            >
                              Open group
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>
          )}
          <div className="mt-6 flex justify-end gap-3 border-t border-[var(--groups1-border)] pt-4">
            <Button
              onClick={() => setEditOpen(false)}
              disabled={saving}
              className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={saving}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogClose onClose={() => setDeleteOpen(false)} />
          <DialogHeader>
            <DialogTitle>Delete student</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--groups1-text-secondary)]">
            Are you sure you want to delete <span className="font-semibold">{student.name}</span>? This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button onClick={() => setDeleteOpen(false)} disabled={deleting} className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

