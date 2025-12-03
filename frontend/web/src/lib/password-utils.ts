import type { PasswordStrength, PasswordValidationResult } from "@/types/password.types";

/**
 * Validate password strength and requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let strength: PasswordStrength = "weak";

  // Check minimum length
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  // Calculate strength
  if (errors.length === 0) {
    // All requirements met, calculate strength based on length and complexity
    if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      strength = "strong";
    } else if (password.length >= 10) {
      strength = "medium";
    } else {
      strength = "medium";
    }
  } else if (errors.length <= 2 && password.length >= 8) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Get password strength level
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "weak";
  const validation = validatePassword(password);
  return validation.strength;
}

/**
 * Get color for password strength indicator
 */
export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case "strong":
      return "#10b981"; // Green
    case "medium":
      return "#f59e0b"; // Yellow/Orange
    case "weak":
      return "#ef4444"; // Red
    default:
      return "var(--groups1-text-secondary)";
  }
}

/**
 * Format OTP countdown timer
 */
export function formatOtpTime(seconds: number): string {
  if (seconds <= 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Get password requirements checklist
 */
export function getPasswordRequirements(): Array<{ label: string; test: (password: string) => boolean }> {
  return [
    {
      label: "At least 8 characters",
      test: (pwd) => pwd.length >= 8,
    },
    {
      label: "At least one uppercase letter",
      test: (pwd) => /[A-Z]/.test(pwd),
    },
    {
      label: "At least one lowercase letter",
      test: (pwd) => /[a-z]/.test(pwd),
    },
    {
      label: "At least one number",
      test: (pwd) => /[0-9]/.test(pwd),
    },
    {
      label: "At least one special character",
      test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    },
  ];
}

