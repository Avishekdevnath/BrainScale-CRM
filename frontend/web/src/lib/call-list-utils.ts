import type { CallList, Question, Answer, CallListItemState, CallLogStatus } from "@/types/call-lists.types";

/**
 * Extract questions from call list meta.questions
 */
export function extractQuestions(callList: CallList | null | undefined): Question[] {
  if (!callList) return [];
  
  // Questions are already extracted in API response or in meta.questions
  if (callList.questions && Array.isArray(callList.questions)) {
    return callList.questions;
  }
  
  if (callList.meta?.questions && Array.isArray(callList.meta.questions)) {
    return callList.meta.questions as Question[];
  }
  
  return [];
}

/**
 * Format answer for display based on type
 */
export function formatAnswer(answer: Answer): string {
  if (answer.answerType === "boolean" || answer.answerType === "yes_no") {
    return answer.answer === true ? "Yes" : answer.answer === false ? "No" : String(answer.answer);
  }
  
  if (answer.answerType === "number") {
    return String(answer.answer);
  }
  
  if (answer.answerType === "date") {
    try {
      const date = new Date(answer.answer as string);
      return date.toLocaleDateString();
    } catch {
      return String(answer.answer);
    }
  }
  
  return String(answer.answer);
}

/**
 * Validate answer matches question type
 */
export function validateAnswer(answer: any, question: Question): { valid: boolean; error?: string } {
  if (question.required && (answer === undefined || answer === null || answer === "")) {
    return { valid: false, error: `"${question.question}" is required` };
  }
  
  if (answer === undefined || answer === null || answer === "") {
    return { valid: true }; // Optional fields can be empty
  }
  
  switch (question.type) {
    case "yes_no":
      if (typeof answer !== "boolean") {
        return { valid: false, error: `"${question.question}" must be Yes or No` };
      }
      break;
      
    case "multiple_choice":
      if (typeof answer !== "string") {
        return { valid: false, error: `"${question.question}" must be a valid option` };
      }
      if (!question.options?.includes(answer)) {
        return { valid: false, error: `"${question.question}" must be one of the provided options` };
      }
      break;
      
    case "number":
      if (typeof answer !== "number" && !/^\d+(\.\d+)?$/.test(String(answer))) {
        return { valid: false, error: `"${question.question}" must be a number` };
      }
      break;
      
    case "date":
      if (typeof answer !== "string") {
        return { valid: false, error: `"${question.question}" must be a valid date` };
      }
      try {
        const date = new Date(answer);
        if (isNaN(date.getTime())) {
          return { valid: false, error: `"${question.question}" must be a valid date` };
        }
      } catch {
        return { valid: false, error: `"${question.question}" must be a valid date` };
      }
      break;
      
    case "text":
      if (typeof answer !== "string") {
        return { valid: false, error: `"${question.question}" must be text` };
      }
      break;
  }
  
  return { valid: true };
}

/**
 * Validate all required questions are answered and types match
 */
export function validateCallLog(answers: Answer[], questions: Question[]): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  const answeredQuestionIds = new Set(answers.map(a => a.questionId));
  
  // Check all required questions are answered
  for (const question of questions) {
    if (question.required && !answeredQuestionIds.has(question.id)) {
      errors.push(`Required question "${question.question}" is not answered`);
    }
  }
  
  // Validate each answer
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question) {
      errors.push(`Answer for unknown question "${answer.question}" found`);
      continue;
    }
    
    const validation = validateAnswer(answer.answer, question);
    if (!validation.valid && validation.error) {
      errors.push(validation.error);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get human-readable state label
 */
export function getStateLabel(state: CallListItemState): string {
  switch (state) {
    case "QUEUED":
      return "Pending";
    case "CALLING":
      return "In Progress";
    case "DONE":
      return "Completed";
    case "SKIPPED":
      return "Skipped";
    default:
      return state;
  }
}

/**
 * Get color for state badge
 */
export function getStateColor(state: CallListItemState): string {
  switch (state) {
    case "QUEUED":
      return "yellow"; // warning
    case "CALLING":
      return "blue"; // info
    case "DONE":
      return "green"; // success
    case "SKIPPED":
      return "gray"; // neutral
    default:
      return "gray";
  }
}

/**
 * Get human-readable call status label
 */
export function getStatusLabel(status: CallLogStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "missed":
      return "Missed";
    case "busy":
      return "Busy";
    case "no_answer":
      return "No Answer";
    case "voicemail":
      return "Voicemail";
    case "other":
      return "Other";
    default:
      return status;
  }
}

/**
 * Get color for status badge
 */
export function getStatusColor(status: CallLogStatus): string {
  switch (status) {
    case "completed":
      return "green"; // success
    case "missed":
      return "red"; // error
    case "busy":
      return "yellow"; // warning
    case "no_answer":
      return "gray"; // neutral
    case "voicemail":
      return "blue"; // info
    case "other":
      return "gray"; // neutral
    default:
      return "gray";
  }
}

/**
 * Format call duration as "5m 30s" or "30s" or "N/A"
 */
export function formatCallDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) {
    return "N/A";
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Generate unique question ID
 */
export function buildQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

