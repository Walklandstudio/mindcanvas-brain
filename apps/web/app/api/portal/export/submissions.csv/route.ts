// apps/web/app/api/portal/export/submissions.csv/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase, ensurePortalMember } from "@/app/_lib/portal";

export async function GET(req: Request) {
  const sb = await getServerSupabase();
  const orgId = await ensurePortalMember({ sb });

  // Optional: filter by test slug via ?slug=...
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || undefined;

  // Resolve test_id if slug is given
  let testId: string | undefined;
  if (slug) {
    const { data: t, error } = await sb
      .from("org_tests")
      .select("id")
      .eq("org_id", orgId)
      .eq("slug", slug)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    testId = t?.id as string | undefined;
  }

  // Pull submissions (adjust columns to your schema)
  const q = sb
    .from("test_submissions")
    .select("id, org_id, test_id, taker_name, taker_email, profile, flow, score, submitted_at")
    .eq("org_id", orgId)
    .order("submitted_at", { ascending: false });

  const { data, error } = testId ? await q.eq("test_id", testId) : await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Build CSV
  const headers = [
    "id",
    "org_id",
    "test_id",
    "taker_name",
    "taker_email",
    "profile",
    "flow",
    "score",
    "submitted_at",
  ];
  const lines = [
    headers.join(","),
    ...(data ?? []).map((r: any) =>
      [
        r.id,
        r.org_id,
        r.test_id,
        csvCell(r.taker_name),
        csvCell(r.taker_email),
        r.profile,
        r.flow,
        r.score,
        r.submitted_at,
      ].join(",")
    ),
  ].join("\n");

  return new NextResponse(lines, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="submissions${slug ? "-" + slug : ""}.csv"`,
    },
  });
}

function csvCell(v: any) {
  if (v == null) return "";
  const s = String(v);
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
