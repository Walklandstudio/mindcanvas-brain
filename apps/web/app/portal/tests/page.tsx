// apps/web/app/portal/tests/page.tsx
import Link from 'next/link';
import { getAdminClient, getActiveOrgId } from '@/app/_lib/portal';

type OrgTest = {
  id: string;
  name: string;
  slug: string;
  status?: string | null;
  mode?: string | null;
};

export default async function PortalTestsPage() {
  const sb = await getAdminClient();
  const orgId = await getActiveOrgId(sb);

  if (!orgId) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Tests</h1>
        <p style={{ marginTop: 8 }}>
          No active organization selected. Go to <Link href="/admin">/admin</Link> and click <em>Set Active</em>,
          then return here.
        </p>
      </main>
    );
  }

  const { data: tests, error } = await sb
    .from('org_tests')
    .select('id,name,slug,status,mode')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Tests</h1>

      {error && (
        <p style={{ color: 'crimson' }}>
          Failed to load tests: {error.message}
        </p>
      )}

      {!error && (!tests || tests.length === 0) && (
        <div
          style={{
            padding: 16,
            border: '1px dashed #ddd',
            borderRadius: 10,
            background: '#fafafa',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No tests found for this organization.</div>
          <div>
            Seed a test (e.g. <code>team-puzzle-profile</code>) and refresh this page.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {(tests as OrgTest[] | null)?.map((t) => (
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

            {/* Link to a per-test page if you have one */}
            <Link
              href={`/portal/tests/${t.id}`}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd' }}
            >
              Open
            </Link>

            {/* Optional: link generator page (if implemented) */}
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
