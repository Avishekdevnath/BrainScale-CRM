import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/common/PublicNavbar";
import { PublicFooter } from "@/components/common/PublicFooter";
import { AuthLayoutContent } from "@/components/common/AuthLayoutContent";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--groups1-background)]">
      <PublicNavbar />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <AuthLayoutContent>{children}</AuthLayoutContent>
      </main>
      <PublicFooter />
    </div>
  );
}


