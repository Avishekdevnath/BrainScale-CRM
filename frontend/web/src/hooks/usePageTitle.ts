import { useEffect } from "react";

interface UsePageTitleOptions {
  brand?: string;
  separator?: string;
}

const DEFAULT_BRAND = "BrainScale CRM";
const DEFAULT_SEPARATOR = " | ";

export function usePageTitle(title: string | null | undefined, options?: UsePageTitleOptions) {
  const brand = options?.brand ?? DEFAULT_BRAND;
  const separator = options?.separator ?? DEFAULT_SEPARATOR;

  useEffect(() => {
    if (typeof document === "undefined") return;

    const resolvedTitle = title?.trim();
    document.title = resolvedTitle ? `${resolvedTitle}${separator}${brand}` : brand;
  }, [title, brand, separator]);
}

