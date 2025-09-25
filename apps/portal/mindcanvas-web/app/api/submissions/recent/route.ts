import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type RecentRow = {
  submission_id: string;     // normalized
  created_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  test_id?: string | null;
  org_id?: string | null;
};

function isRec(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function mapSubmissionRows(rows: unknown[]): RecentRow[] {
  const out: RecentRow[] = [];
  for (const r of rows) {
    if (!isRec(r)) continue;
    const id = r["id"];
    if (typeof id !== "string") continue;
    out.push({
      submission_id: id,
      created_at: r["created_at"] ? String(r["created_at"]) : null,
      first_name: typeof r["first_name"] === "string" ? r["first_name"] : null,
      last_name: typeof r["last_name"] === "string" ? r["last_name"] : null,
      email: typeof r["email"] === "string" ? r["email"] : null,
      test_id: typeof r["test_id"] === "string" ? r["test_id"] : null,
      org_id: typeof r["org_id"] === "string" ? r["org_id"] : null,
    });
  }
  return out;
}

/**
 * GET /api/submissions/recent?limit=20
 * Optional filters: &org_id=<uuid>&test_id=<uuid>
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitQ = Number(url.searchParams.get("limit") ?? "20");
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitQ) ? limitQ : 20));
  const orgId = url.searchParams.get("org_id") ?? undefined;
  const testId = url.searchParams.get("test_id") ?? undefined;

  const db = supabaseServer();

  let q = db
    .from("mc_submissions")
    .select("id, created_at, first_name, last_name, email, test_id, org_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (orgId) q = q.eq("org_id", orgId);
  if (testId) q = q.eq("test_id", testId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    rows: mapSubmissionRows((data ?? []) as unknown[]),
  });
}
