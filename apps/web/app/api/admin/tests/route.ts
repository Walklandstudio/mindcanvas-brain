import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

type Out = { id: string; name: string; test_type?: string | null; is_active?: boolean | null };

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    const sb = createClient().schema("portal");

    // 1) Try the org-scoped view first (preferred)
    let rows: any[] = [];
    {
      const { data, error } = await sb
        .from("v_org_tests")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        // don’t fail yet — fall through to base table
      } else if (Array.isArray(data) && data.length) {
        rows = data;
      }
    }

    // 2) Fallback: base table (org_id on tests)
    if (!rows.length) {
      const { data, error } = await sb
        .from("tests")
        .select("id, name, test_type, is_active, org_id, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      rows = Array.isArray(rows) && rows.length ? rows : (data ?? []);
    }

    // 3) Map to safe output (handle varied column names)
    const out: Out[] = (rows || []).map((r: any) => ({
      id: r.id,
      name: r.name ?? r.test_name ?? "Untitled test",
      test_type: r.test_type ?? r.mode ?? null,
      is_active: r.is_active ?? r.active ?? null,
    }));

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
