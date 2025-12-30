import * as React from "react";

import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "groups1";
}

export function Card({ className, variant = "default", suppressHydrationWarning, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      suppressHydrationWarning={suppressHydrationWarning}
      className={cn(
        variant === "groups1"
          ? "bg-[var(--groups1-surface)] text-[var(--groups1-text)] border-[var(--groups1-card-border)] rounded-xl shadow-sm"
          : "bg-[color-mix(in_oklab,var(--card) 40%,transparent)] dark:bg-[color-mix(in_oklab,var(--card) 5%,transparent)] text-[hsl(var(--card-foreground, var(--foreground)))] backdrop-blur-md shadow-sm",
        "flex flex-col gap-6 rounded-xl border",
        variant === "default" && "border-[hsl(var(--border))]",
        className
      )}
      {...props}
    />
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "groups1";
}

export function CardHeader({ className, variant = "default", suppressHydrationWarning, ...props }: CardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      suppressHydrationWarning={suppressHydrationWarning}
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-4 has-[data-slot=card-action]:grid-cols-[1fr_auto]",
        variant === "groups1"
          ? "border-b border-[var(--groups1-card-border-inner)] pt-6 pb-4"
          : "[.border-b]:pb-6",
        "px-6",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-base font-semibold leading-none", className)}
      {...props}
    />
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "groups1";
}

export function CardContent({ className, variant = "default", suppressHydrationWarning, ...props }: CardContentProps) {
  return (
    <div
      data-slot="card-content"
      suppressHydrationWarning={suppressHydrationWarning}
      className={cn(
        variant === "groups1" ? "px-4 py-4" : "px-6",
        className
      )}
      {...props}
    />
  );
}

