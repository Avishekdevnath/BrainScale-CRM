import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/common/PublicNavbar";
import { PublicFooter } from "@/components/common/PublicFooter";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--groups1-background)] flex flex-col">
      <PublicNavbar />
      <div className="flex-1">
        <div className="mx-auto w-full max-w-2xl p-4 md:p-6">{children}</div>
      </div>
      <PublicFooter />
    </div>
  );
}
