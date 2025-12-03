"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AuthLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWidePage = pathname === "/choose-plan";

  return (
    <div
      className={cn(
        "w-full",
        isWidePage ? "max-w-7xl" : "max-w-md"
      )}
    >
      {children}
    </div>
  );
}

