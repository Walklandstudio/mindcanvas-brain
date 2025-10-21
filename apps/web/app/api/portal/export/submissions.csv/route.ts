// apps/web/app/api/portal/export/submissions.csv/route.ts
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";
import { getActiveOrgId } from "@/app/_lib/portal";

// Helper to build CSV safely
function toCSV(rows: any[]): string {
  if (!rows || rows.length === 0) return "id,test_name,taker_id,started_at,completed_at,total_points,frequency,profile\n";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headerLine = headers.join(",");
  const body = rows.map(r => headers.map(h => escape((r as any)[h])).join(",")).join("\n");
  return `${headerLine}\n${body}\n`;
}

export async function GET(req: Request) {
  const sb = supabaseAdmin();

  // Determine org: try active membership via shim; allow override via query (?orgId=…)
  const url = new URL(req.url);
  const orgIdOverride = url.searchParams.get("orgId");
  const orgId = orgIdOverride || (await getActiveOrgId());
  if (!orgId) {
    return new Response("No active organization found.", { status: 400 });
  }

  // Optional filter by test name via ?q=... (applied after we fetch names)
  const q = (url.searchParams.get("q") || "").toLowerCase();

  // 1) Pull submissions for this org
  const { data: subs, error: subErr } = await sb
    .from("test_submissions")
    .select("id,test_id,taker_id,started_at,completed_at,total_points,frequency,profile")
    .eq("org_id", orgId)
    .order("started_at", { ascending: false });

  if (subErr) {
    return new Response(`Query error: ${subErr.message}`, { status: 500 });
  }

  const submissions = subs ?? [];
  if (submissions.length === 0) {
    // Return empty CSV with headers
    const csv = toCSV([]);
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="submissions.csv"',
      },
    });
  }

  // 2) Resolve test names. Try `org_tests` first; if no matches, fall back to `tests`.
  const testIds = Array.from(new Set(submissions.map((s: any) => s.test_id).filter(Boolean)));

  // Try org_tests
  const { data: orgTests } = await sb
    .from("org_tests")
    .select("id,name")
    .in("id", testIds.length ? testIds : ["00000000-0000-0000-0000-000000000000"]);

  let nameById = new Map<string, string>();
  (orgTests ?? []).forEach((t: any) => {
    if (t?.id) nameById.set(t.id, t.name ?? "Test");
  });

  // If no names resolved, try legacy tests
  if (nameById.size === 0) {
    const { data: legacyTests } = await sb
      .from("tests")
      .select("id,name")
      .in("id", testIds.length ? testIds : ["00000000-0000-0000-0000-000000000000"]);
    (legacyTests ?? []).forEach((t: any) => {
      if (t?.id) nameById.set(t.id, t.name ?? "Test");
    });
  }

  // 3) Build rows
  let rows = submissions.map((s: any) => ({
    id: s.id,
    test_name: nameById.get(s.test_id) ?? "",
    taker_id: s.taker_id ?? "",
    started_at: s.started_at ?? "",
    completed_at: s.completed_at ?? "",
    total_points: s.total_points ?? 0,
    frequency: s.frequency ?? "",
    profile: s.profile ?? "",
  }));

  // Optional client-side name filter (?q=...)
  if (q) {
    rows = rows.filter(r => (r.test_name || "").toLowerCase().includes(q));
  }

  // 4) Emit CSV
  const csv = toCSV(rows);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="submissions.csv"',
    },
  });
}
