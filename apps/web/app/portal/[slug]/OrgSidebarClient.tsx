'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Org = {
  id: string;
  slug: string;
  name: string;
  is_active?: boolean;
  logo_url?: string | null;
};

export default function OrgSidebarClient({ slug }: { slug: string }) {
  const [org, setOrg] = useState<Org | null>(null);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const r = await fetch(`/api/org/${slug}/get`, { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!ok) return;
        if (!r.ok || !j?.ok) {
          setErr(j?.error || `HTTP ${r.status}`);
          setOrg(null);
        } else {
          setOrg(j.org as Org);
        }
      } catch (e: any) {
        if (ok) { setErr(String(e?.message || e)); setOrg(null); }
      }
    })();
    return () => { ok = false; };
  }, [slug]);

  return (
    <div>
      <div className="mb-6">
        {org ? (
          <>
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="h-10" />
            ) : (
              <div className="font-semibold text-lg">{org.name}</div>
            )}
            <div className="text-white/60 text-sm">Welcome, {org.name}</div>
          </>
        ) : (
          <div className="text-white/70 text-sm">
            {err ? `Org load error: ${err}` : 'Loading organization…'}
          </div>
        )}
      </div>

      <nav className="space-y-2">
        <Link href={`/portal/${slug}`} className="block px-3 py-2 rounded hover:bg-white/10">Dashboard</Link>
        <Link href={`/portal/${slug}/database`} className="block px-3 py-2 rounded hover:bg-white/10">Database</Link>
        <Link href={`/portal/${slug}/tests`} className="block px-3 py-2 rounded hover:bg-white/10">Tests</Link>
        <Link href={`/portal/${slug}/profile`} className="block px-3 py-2 rounded hover:bg-white/10">Profile</Link>
        <Link href={`/portal/${slug}/settings`} className="block px-3 py-2 rounded hover:bg-white/10">Settings</Link>
      </nav>
    </div>
  );
}
