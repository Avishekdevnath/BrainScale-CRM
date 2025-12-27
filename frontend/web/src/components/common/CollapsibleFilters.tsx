"use client";

import { Card, CardContent } from "@/components/ui/card";

interface CollapsibleFiltersProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function CollapsibleFilters({ 
  open, 
  children, 
  className,
  contentClassName 
}: CollapsibleFiltersProps) {
  if (!open) return null;

  return (
    <Card variant="groups1" className={className}>
      <CardContent variant="groups1" className={contentClassName}>
        {children}
      </CardContent>
    </Card>
  );
}

