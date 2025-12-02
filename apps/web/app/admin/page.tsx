// apps/web/app/admin/page.tsx
import Link from "next/link";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export default async function AdminPage() {
  const sb = await getAdminClient();

  // Load orgs
  const { data: orgs, error } = await sb
    .from("organizations")
    .select("id,name,slug")
    .order("name", { ascending: true });

  const activeOrgId = await getActiveOrgId(sb);

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 16,
        backgroundColor: "transparent",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Admin</h1>

      {error && (
        <p style={{ color: "crimson" }}>Error loading orgs: {error.message}</p>
      )}

      {/* Organisations section */}
      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Organizations</h2>
        <p style={{ marginTop: 6, color: "#aaa" }}>
          Active org: <strong>{activeOrgId ?? "none"}</strong>
        </p>

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {(orgs ?? []).map((o) => (
            <form
              key={o.id}
              action="/api/admin/switch-org"
              method="post"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 12,
                border: "1px solid #1e293b",
                borderRadius: 10,
                background: "#0b1220",
              }}
            >
              <input type="hidden" name="orgId" value={o.id} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{o.name}</div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#64748b",
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
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "transparent",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Set Active
              </button>
              <Link
                href={`/portal/${o.slug}`}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #334155",
                  textDecoration: "none",
                  color: "white",
                }}
              >
                Open portal
              </Link>
            </form>
          ))}
        </div>
      </section>

      {/* Diagnostics */}
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

      {/* Usage & Analytics */}
      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Usage & Analytics</h2>
        <p style={{ marginTop: 6, color: "#aaa" }}>
          View completed test submissions by organisation, test, and link over
          different time ranges.
        </p>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/admin/usage"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #334155",
              textDecoration: "none",
              fontSize: 14,
              color: "white",
            }}
          >
            Open Usage dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}


