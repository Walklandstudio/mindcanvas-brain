// apps/web/app/portal/[slug]/page.tsx
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getAdminClient } from '@/app/_lib/portal';

type Params = { slug: string };

export default async function OrgPortalPage({ params }: { params: Params }) {
  const slug = String(params?.slug || '').trim();

  const sb = await getAdminClient();

  // Look up org
  const { data: org, error: orgErr } = await sb
    .from('organizations')
    .select('id,name,slug')
    .eq('slug', slug)
    .maybeSingle();

  if (orgErr) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Portal — {slug}</h1>
        <p style={{ color: 'crimson' }}>Error loading org: {orgErr.message}</p>
        <p style={{ marginTop: 6 }}>
          Go back to <Link href="/admin">/admin</Link>.
        </p>
      </main>
    );
  }

  if (!org?.id) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Portal</h1>
        <p style={{ color: 'crimson' }}>Organization not found for slug: {slug}</p>
        <p style={{ marginTop: 6 }}>
          Go back to <Link href="/admin">/admin</Link>.
        </p>
      </main>
    );
  }

  // Load tests for this org
  const { data: tests, error: testsErr } = await sb
    .from('org_tests')
    .select('id,name,slug,status,mode,created_at')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false });

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Client Portal — {org.name}</h1>
      <p style={{ marginTop: 4, color: '#666' }}><code>{org.slug}</code></p>

      {testsErr && (
        <p style={{ color: 'crimson', marginTop: 12 }}>
          Error loading tests: {testsErr.message}
        </p>
      )}

      {!testsErr && (!tests || tests.length === 0) && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            border: '1px dashed #ddd',
            borderRadius: 10,
            background: '#fafafa',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            No tests found for this organization.
          </div>
          <div>Seed a test (e.g., <code>team-puzzle-profile</code>) and refresh.</div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        {(tests ?? []).map((t) => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              border: '1px solid #e5e5e5',
              borderRadius: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{t.slug}</div>
              <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
                {t.mode || '—'} · {t.status || '—'}
              </div>
            </div>

            {/* Per-test admin page (if you have one) */}
            <Link
              href={`/portal/tests/${t.id}`}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd' }}
            >
              Open
            </Link>

            {/* Minimal link creation (existing API route) */}
            <Link
              href={`/api/tests/by-id/${t.id}/link`}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd' }}
            >
              Create link (API)
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
