"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const WIDE_PAGES = ["/choose-plan", "/login", "/signup"];

export function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWidePage = WIDE_PAGES.includes(pathname);

  return (
    <div
      className={cn(
        "w-full",
        isWidePage ? "max-w-4xl" : "max-w-md"
      )}
    >
      {children}
    </div>
  );
}
