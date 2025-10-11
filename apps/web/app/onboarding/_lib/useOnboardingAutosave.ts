'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Section = 'create_account' | 'company' | 'branding' | 'goals';

export function useOnboardingAutosave<T extends object>(section: Section, initial: T) {
  const [data, setData] = useState<T>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  // Load on mount
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/onboarding/get', { cache: 'no-store' });
      const json = await res.json();
      if (json && json[section]) {
        setData((prev) => ({ ...prev, ...json[section] }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save
  const scheduleSave = useCallback((next: Partial<T>) => {
    setData((prev) => ({ ...prev, ...next }));
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!dirty.current) return;
      dirty.current = false;
      await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ section, payload: { ...(next as object), ...(data as object) } })
      });
    }, 400);
  }, [data, section]);

  return { data, setData: scheduleSave };
}
