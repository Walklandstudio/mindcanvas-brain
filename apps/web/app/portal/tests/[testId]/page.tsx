// apps/web/app/portal/tests/[testId]/page.tsx
export const dynamic = 'force-dynamic';

import { getAdminClient, getActiveOrgId } from '@/app/_lib/portal';
import GenerateLinkPanel from './GenerateLinkPanel';

type Params = { testId: string };

export default async function TestDetailPage({
  params,
}: {
  // Next 15: params is a Promise
  params: Promise<Params>;
}) {
  const { testId } = await params;
  const sb = await getAdminClient();
  const orgId = await getActiveOrgId(sb);

  if (!orgId) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Test</h1>
        <p>No active org. Go to /admin and click “Set Active”.</p>
      </main>
    );
  }

  const testRes = await sb
    .from('org_tests')
    .select('id, name, slug, org_id')
    .eq('id', testId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (testRes.error) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Test</h1>
        <p style={{ color: 'crimson' }}>{testRes.error.message}</p>
      </main>
    );
  }

  if (!testRes.data?.id) {
    return (
      <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Test</h1>
        <p style={{ color: 'crimson' }}>Test not found or not in this org.</p>
      </main>
    );
  }

  const appOrigin = process.env.APP_ORIGIN || '';

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Test — {testRes.data.name}</h1>
      <p style={{ color: '#666' }}><code>{testRes.data.slug}</code></p>

      <GenerateLinkPanel
        testId={testRes.data.id}
        testSlug={testRes.data.slug}
        appOrigin={appOrigin}
      />

      {/* Optional: recent links list */}
      <RecentLinks testId={testRes.data.id} />
    </main>
  );
}

async function RecentLinks({ testId }: { testId: string }) {
  const sb = await getAdminClient();
  const { data: links } = await sb
    .from('test_links')
    .select('id, token, max_uses, uses, created_at')
    .eq('test_id', testId)
    .order('created_at', { ascending: false })
    .limit(8);

  if (!links?.length) return null;

  const appOrigin = process.env.APP_ORIGIN || '';
  const full = (token: string) =>
    appOrigin && appOrigin.startsWith('http')
      ? `${appOrigin.replace(/\/+$/, '')}/t/${token}`
      : `/t/${token}`;

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Recent links</h2>
      <ul style={{ display: 'grid', gap: 8 }}>
        {links.map((l) => (
          <li key={l.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontFamily: 'monospace' }}>{l.token}</div>
              <a href={full(l.token)} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                open
              </a>
              <div style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>
                uses {l.uses ?? 0} / {l.max_uses ?? '∞'}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
