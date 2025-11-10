import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const org        = url.searchParams.get("org");
  const q          = (url.searchParams.get("q") || "").toLowerCase();
  const testType   = url.searchParams.get("testType") || "";
  const profile    = url.searchParams.get("profile") || "";
  const frequency  = url.searchParams.get("frequency") || "";
  const company    = url.searchParams.get("company") || "";
  const team       = url.searchParams.get("team") || "";

  if (!org) return new NextResponse("Missing org", { status: 400 });

  const sb = createClient().schema("portal");

  let query = sb
    .from("v_takers_overview")
    .select(
      "name,email,company,team,test_type,completed_at,top_frequency_code,top_frequency_name,top_profile_code,top_profile_name"
    )
    .eq("org_slug", org);

  if (q)         query = query.ilike("search_text", `%${q}%`);
  if (testType)  query = query.eq("test_type", testType);
  if (profile)   query = query.eq("top_profile_code", profile);
  if (frequency) query = query.eq("top_frequency_code", frequency);
  if (company)   query = query.eq("company", company);
  if (team)      query = query.eq("team", team);

  // cap rows to avoid huge downloads; bump if needed
  const { data, error } = await query.limit(10000);

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  const headers = [
    "name",
    "email",
    "company",
    "team",
    "test_type",
    "completed_at",
    "top_frequency_code",
    "top_frequency_name",
    "top_profile_code",
    "top_profile_name",
  ];

  const rows = (data ?? []).map((r: any) =>
    headers
      .map((h) => {
        const v = r[h] ?? "";
        // escape commas/quotes/newlines
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      })
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${org}-takers.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
