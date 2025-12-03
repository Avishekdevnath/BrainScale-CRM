"use client";

import * as React from "react";
import { validatePassword, getPasswordStrengthColor, getPasswordRequirements } from "@/lib/password-utils";

export interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
  onStrengthChange?: (strength: "weak" | "medium" | "strong") => void;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  onStrengthChange,
  className = "",
}: PasswordStrengthIndicatorProps) {
  const validation = React.useMemo(() => validatePassword(password), [password]);
  const requirements = React.useMemo(() => getPasswordRequirements(), []);
  const strengthColor = React.useMemo(
    () => getPasswordStrengthColor(validation.strength),
    [validation.strength]
  );

  React.useEffect(() => {
    onStrengthChange?.(validation.strength);
  }, [validation.strength, onStrengthChange]);

  const strengthPercentage = React.useMemo(() => {
    switch (validation.strength) {
      case "strong":
        return 100;
      case "medium":
        return 66;
      case "weak":
        return 33;
      default:
        return 0;
    }
  }, [validation.strength]);

  if (!password) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--groups1-text-secondary)]">Password strength:</span>
          <span
            className="font-medium capitalize"
            style={{ color: strengthColor }}
          >
            {validation.strength}
          </span>
        </div>
        <div className="w-full h-2 bg-[var(--groups1-secondary)] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${strengthPercentage}%`,
              backgroundColor: strengthColor,
            }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1.5 pt-2">
          <p className="text-xs font-medium text-[var(--groups1-text-secondary)] mb-1">
            Requirements:
          </p>
          <div className="space-y-1">
            {requirements.map((req, index) => {
              const met = req.test(password);
              return (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      met
                        ? "bg-green-500"
                        : "bg-[var(--groups1-secondary)] border border-[var(--groups1-border)]"
                    }`}
                  >
                    {met && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={
                      met
                        ? "text-green-600 dark:text-green-400"
                        : "text-[var(--groups1-text-secondary)]"
                    }
                  >
                    {req.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

