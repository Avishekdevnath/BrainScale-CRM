"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";
import { AnnouncementComposer } from "@/components/platform/announcements/AnnouncementComposer";

export default function NewAnnouncementPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/platform/announcements"
          className="inline-flex items-center gap-1 text-xs text-[var(--groups1-text-secondary)] hover:text-[var(--groups1-text)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Announcements
        </Link>
        <span className="text-[var(--groups1-text-secondary)]">/</span>
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[var(--groups1-primary)]" />
          <h1 className="text-xl font-bold text-[var(--groups1-text)]">New announcement</h1>
        </div>
      </div>

      <AnnouncementComposer
        onSent={() => router.push("/platform/announcements")}
        onCancel={() => router.push("/platform/announcements")}
      />
    </div>
  );
}
