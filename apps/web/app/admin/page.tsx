// apps/web/app/admin/page.tsx
import Link from 'next/link';
import { getAdminClient, getActiveOrgId } from '@/app/_lib/portal';

export default async function AdminPage() {
  const sb = await getAdminClient();

  // Load orgs
  const { data: orgs, error } = await sb
    .from('organizations')
    .select('id,name,slug')
    .order('name', { ascending: true });

  const activeOrgId = await getActiveOrgId(sb);

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Admin</h1>

      {error && (
        <p style={{ color: 'crimson' }}>
          Error loading orgs: {error.message}
        </p>
      )}

      {/* Organisations section (unchanged) */}
      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Organizations</h2>
        <p style={{ marginTop: 6, color: '#555' }}>
          Active org: <strong>{activeOrgId ?? 'none'}</strong>
        </p>

        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {(orgs ?? []).map((o) => (
            <form
              key={o.id}
              action="/api/admin/switch-org"
              method="post"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 12,
                border: '1px solid #e5e5e5',
                borderRadius: 10,
              }}
            >
              <input type="hidden" name="orgId" value={o.id} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{o.name}</div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: '#666',
                  }}
                >
                  {o.slug}
                </div>
              </div>
              <button
                type="submit"
                name="mode"
                value="switch"
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                }}
              >
                Set Active
              </button>
              <Link
                href={`/portal/${o.slug}`}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                }}
              >
                Open portal
              </Link>
            </form>
          ))}
        </div>
      </section>

      {/* Diagnostics (unchanged) */}
      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Diagnostics</h2>
        <ul style={{ marginTop: 8 }}>
          <li>
            <a href="/api/debug/diag" target="_blank" rel="noreferrer">
              /api/debug/diag
            </a>
          </li>
        </ul>
      </section>

      {/* ✅ NEW: Usage & Analytics section */}
      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Usage & Analytics</h2>
        <p style={{ marginTop: 6, color: '#555' }}>
          View completed test submissions by organisation, test, and link over different time ranges.
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link
            href="/admin/usage"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #ddd',
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            Open Usage dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

