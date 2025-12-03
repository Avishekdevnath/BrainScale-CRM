"use client";

import { Button } from "@/components/ui/button";
import { useCountdown } from "@/hooks/useCountdown";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RetryButtonProps {
  canRetryAt: string | null | undefined;
  onRetry: () => void;
  email: string;
  variant?: "email" | "otp";
  disabled?: boolean;
  className?: string;
}

export function RetryButton({
  canRetryAt,
  onRetry,
  email,
  variant = "email",
  disabled = false,
  className,
}: RetryButtonProps) {
  const countdown = useCountdown(canRetryAt);
  const isReady = countdown.isReady;
  const isDisabled = disabled || !isReady || !email;

  const buttonText =
    variant === "email" ? "Resend Verification Email" : "Resend Verification Code";

  return (
    <Button
      onClick={onRetry}
      disabled={isDisabled}
      className={cn(
        "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]",
        className
      )}
    >
      {!isReady ? (
        `Retry in ${countdown.formatted}`
      ) : (
        buttonText
      )}
    </Button>
  );
}

