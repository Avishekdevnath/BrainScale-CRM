"use client";

import { useState } from "react";
import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { usePlatformAnnouncements } from "@/hooks/usePlatform";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { AnnouncementStatsCards } from "@/components/platform/announcements/AnnouncementStatsCards";
import { AnnouncementsTable } from "@/components/platform/announcements/AnnouncementsTable";
import { AnnouncementDetailsDialog } from "@/components/platform/announcements/AnnouncementDetailsDialog";
import type { Announcement } from "@/types/notifications.types";

const PAGE_SIZE = 20;

export default function PlatformAnnouncementsPage() {
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, error, mutate } = usePlatformAnnouncements({ size: PAGE_SIZE, page });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const handleDelete = async (announcement: Announcement) => {
    const confirmed = window.confirm(
      `Delete "${announcement.title}"?\n\nThis removes it from ${announcement.recipientCount} member notification list${announcement.recipientCount === 1 ? "" : "s"}. This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(announcement.id);
    try {
      await apiClient.platformDeleteAnnouncement(announcement.id);
      toast.success("Announcement deleted");
      if (viewingId === announcement.id) setViewingId(null);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete announcement");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[var(--groups1-primary)]" />
          <h1 className="text-xl font-bold text-[var(--groups1-text)]">Announcements</h1>
        </div>
        <Link
          href="/platform/announcements/new"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)]"
        >
          <Plus className="w-3.5 h-3.5" /> New announcement
        </Link>
      </div>

      <AnnouncementStatsCards
        items={data?.items ?? []}
        total={data?.total ?? 0}
        isLoading={isLoading}
      />

      <AnnouncementsTable
        items={data?.items ?? []}
        isLoading={isLoading}
        error={error}
        page={page}
        totalPages={totalPages}
        total={data?.total ?? 0}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onView={setViewingId}
        onDelete={handleDelete}
        deletingId={deletingId}
      />

      <AnnouncementDetailsDialog
        announcementId={viewingId}
        onOpenChange={(open) => { if (!open) setViewingId(null); }}
        onDelete={handleDelete}
        deletingId={deletingId}
      />
    </div>
  );
}
