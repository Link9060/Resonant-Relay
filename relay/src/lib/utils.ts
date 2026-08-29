import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a stored 7-digit Relay Number as "123-4567" for display. */
export function formatRelayNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 7) return raw;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

/** Strips formatting so user input ("123-4567" or "123 4567") matches storage. */
export function normalizeRelayNumber(input: string): string {
  return input.replace(/\D/g, '');
}
