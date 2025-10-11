'use client';

import { useEffect, useRef, useState } from 'react';

type AnyObj = Record<string, any>;

export function useOnboardingAutosave<T extends AnyObj>(
  stepKey: 'company' | 'branding' | 'goals',
  initial: T
) {
  const STORAGE_KEY = `mc_onboarding_${stepKey}`;
  const [data, setData] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData((d) => ({ ...d, ...JSON.parse(raw) }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);

  const saveNow = async () => {
    setSaving(true);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [stepKey]: data }),
      });
    } finally {
      setSaving(false);
    }
  };

  const scheduleSave = () => {
    if (timer.current) window.clearTimeout(timer.current);
    // @ts-ignore
    timer.current = window.setTimeout(saveNow, 600);
  };

  const update = <K extends keyof T>(key: K, value: T[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
    scheduleSave();
  };

  const loadFromServer = (server: T | undefined) => {
    if (server) setData(prev => ({ ...prev, ...server }));
  };

  const clearDraft = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return { data, setData, update, saving, saveNow, loadFromServer, clearDraft };
}
