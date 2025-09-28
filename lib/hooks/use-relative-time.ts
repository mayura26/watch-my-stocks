import { useState, useEffect } from 'react';
import { formatRelativeTime, formatRelativeTimeDetailed } from '@/lib/utils';

/**
 * Custom hook that returns a formatted relative time string that updates automatically
 * @param date - The date to format (can be Date object, string, or timestamp)
 * @param detailed - Whether to use detailed formatting (default: false)
 * @param updateIntervalMs - How often to update the relative time (default: 1000ms = 1 second)
 * @returns Formatted relative time string
 */
export function useRelativeTime(
  date: Date | string | number | undefined | null,
  detailed: boolean = false,
  updateIntervalMs: number = 1000
): string {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!date) return;

    // Update every second to keep relative time current
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, updateIntervalMs);

    return () => clearInterval(interval);
  }, [date, updateIntervalMs]);

  if (!date) return '';

  return detailed ? formatRelativeTimeDetailed(date) : formatRelativeTime(date);
}

/**
 * Hook for getting a detailed relative time string that updates automatically
 * @param date - The date to format
 * @param updateIntervalMs - Update interval in milliseconds
 * @returns Detailed formatted relative time string
 */
export function useDetailedRelativeTime(
  date: Date | string | number | undefined | null,
  updateIntervalMs: number = 1000
): string {
  return useRelativeTime(date, true, updateIntervalMs);
}
