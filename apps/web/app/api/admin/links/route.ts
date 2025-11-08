import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const sb = createClient().schema("portal");
    // Join to tests to surface test name when link name is not set
    const { data, error } = await sb
      .from("test_links")
      .select("token, created_at, show_results, is_active, expires_at, name, contact_owner, email_report, test_id, tests:name=test_id(name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data || []).map((r: any) => ({
      token: r.token,
      created_at: r.created_at,
      show_results: r.show_results,
      is_active: r.is_active,
      expires_at: r.expires_at,
      test_name: r.name || r.tests?.name || "Unnamed test",
      contact_owner: r.contact_owner || null,
      email_report: !!r.email_report,
    }));

    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
