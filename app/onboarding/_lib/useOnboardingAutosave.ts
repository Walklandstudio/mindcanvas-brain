'use client';

import { useEffect, useRef } from 'react';

/**
 * Debounced autosave hook.
 * Call it from a page after you've loaded state into `data`.
 *
 * @param data   – the object to persist
 * @param save   – async function that persists the object
 * @param delay  – debounce ms (default 500)
 */
export default function useOnboardingAutosave<T>(
  data: T,
  save: (d: T) => Promise<void> | void,
  delay = 500
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  const lastJSON = useRef<string>('');

  useEffect(() => {
    const json = JSON.stringify(data ?? {});
    // Avoid firing on the very first render (before load finishes)
    if (first.current) {
      first.current = false;
      lastJSON.current = json;
      return;
    }
    if (json === lastJSON.current) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      lastJSON.current = json;
      await Promise.resolve(save(data));
    }, delay);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, delay, save]);
}
