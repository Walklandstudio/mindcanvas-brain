'use client';

import { useEffect, useRef } from 'react';

/**
 * Debounced autosave for onboarding pages.
 *
 * @param data    Any serializable object you want to autosave
 * @param onSave  Called with the latest `data` after `delay` ms of inactivity
 * @param delay   Optional debounce delay in ms (default 400)
 */
export default function useOnboardingAutosave<T>(
  data: T,
  onSave: (latest: T) => Promise<unknown> | unknown,
  delay: number = 400
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRef = useRef<string>('');

  useEffect(() => {
    const json = safeStableStringify(data);
    if (json === prevRef.current) return; // nothing changed

    prevRef.current = json;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Fire and forget; caller can handle errors internally if needed
      Promise.resolve(onSave(data)).catch(() => {
        /* no-op (avoid unhandled rejection) */
      });
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, delay, onSave]);
}

/** JSON stringify with fallback to avoid throwing on odd values. */
function safeStableStringify(value: unknown): string {
  try {
    return JSON.stringify(value, replacer, 2);
  } catch {
    return String(value);
  }
}

// Ensure stable key order to prevent noisy diffs
function replacer(_: string, v: any) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.keys(v)
      .sort()
      .reduce((acc: Record<string, unknown>, k) => {
        acc[k] = v[k];
        return acc;
      }, {});
  }
  return v;
}
