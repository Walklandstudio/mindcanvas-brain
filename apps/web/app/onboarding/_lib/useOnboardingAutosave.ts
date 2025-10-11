// apps/web/app/onboarding/_lib/useOnboardingAutoSave.ts
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Autosaves a section of the onboarding object to /api/onboarding.
 * Usage:
 *   useOnboardingAutosave('branding', data);
 *
 * The hook debounces writes to avoid chatty requests.
 */
export function useOnboardingAutosave<T extends object>(
  section: 'company' | 'branding' | 'goals',
  data: T,
  options?: { debounceMs?: number }
) {
  const debounceMs = options?.debounceMs ?? 600;
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayloadRef = useRef<string>('');

  useEffect(() => {
    const payload = JSON.stringify({ [section]: data ?? {} });

    // Don't post identical bodies back-to-back
    if (payload === lastPayloadRef.current) return;
    lastPayloadRef.current = payload;

    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(async () => {
      setIsSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || 'Failed to save');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to save');
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [section, data, debounceMs]);

  return { isSaving, error };
}
