// apps/web/app/api/portal/export/submissions.csv/route.ts
import { ensurePortalMember } from "@/app/_lib/portal";

export async function GET(req: Request) {
  const { supabase, orgId } = await ensurePortalMember();
  const url = new URL(req.url);
  const orgParam = url.searchParams.get("org");
  if (orgParam && orgParam !== orgId) {
    return new Response("forbidden", { status: 403 });
  }

  const { data, error } = await supabase
    .from("test_submissions")
    .select("*")
    .eq("org_id", orgId)
    .order("submitted_at", { ascending: false })
    .limit(5000);

  if (error) return new Response(error.message, { status: 400 });

  const headers = ["id","org_id","test_id","taker_name","taker_email","profile_code","flow_code","submitted_at"];
  const lines = [
    headers.join(","),
    ...(data ?? []).map((r: any) =>
      headers.map((h) => {
        const v = r[h];
        const s = v == null ? "" : String(v);
        // escape CSV
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    ),
  ];
  const csv = lines.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="submissions_${orgId}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
