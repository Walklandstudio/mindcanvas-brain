'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { OverallTile, FrequenciesBar, ProfilesBar, TopBottom, HeaderFilters } from '@/components/dashboard/Widgets';

type DashPayload = {
  frequencies?: any[];
  profiles?: any[];
  top3?: any[];
  bottom3?: any[];
  overall?: { overall_avg?: number };
};

export default function DashboardPage() {
  const sp = useSearchParams();
  const router = useRouter();

  // Read from URL, fall back to sensible defaults.
  const orgFromUrl = sp?.get('org') ?? 'team-puzzle';
  const testIdFromUrl = sp?.get('testId') ?? '';

  const [org, setOrg] = useState(orgFromUrl);
  const [testId, setTestId] = useState(testIdFromUrl);

  const [data, setData] = useState<DashPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // push filters into the URL when local state changes (nice for sharing links)
  useEffect(() => {
    const qs = new URLSearchParams();
    if (org) qs.set('org', org);
    if (testId) qs.set('testId', testId);
    router.replace(`/portal/(app)/dashboard?${qs.toString()}`);
  }, [org, testId, router]);

  // fetch payload whenever filters change
  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const qs = new URLSearchParams({ org });
        if (testId) qs.set('testId', testId);
        const res = await fetch(`/api/portal-dashboard?${qs.toString()}`, { cache: 'no-store' });
        const json = await res.json().catch(() => ({} as any));
        if (!res.ok || json?.ok === false) throw new Error(json?.error || `Request failed: ${res.status}`);
        if (!aborted) setData(json.data as DashPayload);
      } catch (e: any) {
        if (!aborted) setErr(e.message || 'Failed to load dashboard');
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [org, testId]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      <HeaderFilters
        org={org}
        testId={testId}
        onChange={({ org, testId }) => { setOrg(org); setTestId(testId); }}
      />

      {loading && <div className="p-4">Loading…</div>}
      {err && !loading && <div className="p-4 text-red-600">Error: {err}</div>}

      {!loading && !err && (
        <>
          <OverallTile overallAvg={data?.overall?.overall_avg} />

          <div className="grid gap-6 md:grid-cols-2">
            <FrequenciesBar data={(data?.frequencies ?? []) as any[]} />
            <ProfilesBar data={(data?.profiles ?? []) as any[]} />
          </div>

          <TopBottom top3={(data?.top3 ?? []) as any[]} bottom3={(data?.bottom3 ?? []) as any[]} />
        </>
      )}
    </div>
  );
}

