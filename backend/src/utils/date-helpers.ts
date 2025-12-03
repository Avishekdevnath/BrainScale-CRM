/**
 * Date utility functions
 */

export const getStartOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getEndOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const getStartOfMonth = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const getDaysAgo = (days: number, from: Date = new Date()): Date => {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
};

export const getTomorrow = (from: Date = new Date()): Date => {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 59, 999);
  return d;
};

