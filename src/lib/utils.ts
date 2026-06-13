import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines tailwind classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number with commas (e.g. 10000 -> "10,000") or abbreviations (e.g. 1500000 -> "1.5M").
 */
export function formatNumber(num: number, abbreviate = false): string {
  if (abbreviate) {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
    }
  }
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Formats a date to a readable string (e.g. "Jun 10, 2026, 9:30 PM").
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return 'Never'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

/**
 * Generates an account initials string for avatars.
 */
export function getInitials(name: string): string {
  if (!name) return 'X'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
