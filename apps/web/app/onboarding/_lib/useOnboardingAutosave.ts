'use client';

import { useEffect, useRef } from 'react';

type SaveFn = (payload: any) => Promise<void>;

/**
 * Autosaves the passed data object every time it changes (debounced).
 * You must pass the *whole* section object each time.
 */
export function useOnboardingAutosave<T>(
  data: T,
  save: SaveFn,
  delay = 500
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<T>(data);

  useEffect(() => { latest.current = data; }, [data]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(latest.current); }, delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [data, save, delay]);
}
