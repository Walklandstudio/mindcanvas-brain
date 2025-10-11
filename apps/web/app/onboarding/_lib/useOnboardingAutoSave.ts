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

  // hydrate from server (caller sets) and local draft
  useEffect(() => {
    try {
      const draftRaw = localStorage.getItem(STORAGE_KEY);
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        setData((d) => ({ ...d, ...draft }));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist draft locally, debounce POST
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    // eslint-disable-next-line
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
    setData(prev => {
      const next = { ...prev, [key]: value };
      return next;
    });
    scheduleSave();
  };

  const loadFromServer = (serverData: T | undefined) => {
    if (serverData) setData(prev => ({ ...prev, ...serverData }));
  };

  const clearDraft = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return { data, setData, update, saving, saveNow, loadFromServer, clearDraft };
}
