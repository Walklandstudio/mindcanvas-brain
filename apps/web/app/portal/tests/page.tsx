// apps/web/app/portal/page.tsx
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getAdminClient, getActiveOrgId } from '@/app/_lib/portal';

export default async function PortalLanding() {
  try {
    const sb = await getAdminClient();
    const orgId = await getActiveOrgId(sb);

    if (!orgId) {
      return (
        <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Portal</h1>
          <p style={{ marginTop: 8 }}>
            No active organization selected.
          </p>
          <p style={{ marginTop: 6 }}>
            Go to <Link href="/admin">/admin</Link>, click <em>Set Active</em> for the org you want, then return here.
          </p>
        </main>
      );
    }

    const { data: org, error } = await sb
      .from('organizations')
      .select('slug,name')
      .eq('id', orgId)
      .maybeSingle();

    if (error) {
      return (
        <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Portal</h1>
          <p style={{ color: 'crimson' }}>Error loading org: {error.message}</p>
          <p style={{ marginTop: 6 }}>
            Re-select an organization from <Link href="/admin">/admin</Link>.
          </p>
        </main>
      );
    }

    if (!org?.slug) {
      return (
        <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Portal</h1>
          <p style={{ color: 'crimson' }}>
            Active organization not found in the database.
          </p>
          <p style={{ marginTop: 6 }}>
            Re-select an organization from <Link href="/admin">/admin</Link>.
          </p>
        </main>
      );
    }

    // Render a tiny redirect (no throw if meta redirect fails)
    return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Portal</h1>
        <p>Routing you to <code>/portal/{org.slug}</code>…</p>
        <meta httpEquiv="refresh" content={`0; url=/portal/${org.slug}`} />
        <p style={{ marginTop: 8 }}>
          If nothing happens, <Link href={`/portal/${org.slug}`}>click here</Link>.
        </p>
      </main>
    );
  } catch (e: any) {
    return (
      <main style={{ maxWidth: 720, margin: '40px auto', padding: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Portal</h1>
        <p style={{ color: 'crimson' }}>Unexpected error.</p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            background: '#fafafa',
            padding: 12,
            borderRadius: 8,
            border: '1px solid #eee',
            fontSize: 12,
          }}
        >
{String(e?.message || e)}
        </pre>
        <p style={{ marginTop: 8 }}>
          Try re-selecting an organization from <Link href="/admin">/admin</Link>.
        </p>
      </main>
    );
  }
}
