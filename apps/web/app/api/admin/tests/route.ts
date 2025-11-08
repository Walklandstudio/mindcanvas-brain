import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";

export const runtime = "nodejs";

type Out = { id: string; name: string; test_type?: string | null; is_active?: boolean | null };

function pickId(row: any): string | null {
  return row?.id ?? row?.test_id ?? row?.tid ?? null;
}
function pickName(row: any): string {
  return row?.name ?? row?.test_name ?? "Untitled test";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    const sb = createClient().schema("portal");

    // Try org-scoped view first
    let rows: any[] = [];
    {
      const { data, error } = await sb
        .from("v_org_tests")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length) rows = data;
    }

    // Fallback to base table
    if (!rows.length) {
      const { data, error } = await sb
        .from("tests")
        .select("id, name, test_type, is_active, org_id, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      rows = data ?? [];
    }

    const out: Out[] = (rows || [])
      .map((r: any) => {
        const id = pickId(r);
        if (!id) return null;
        return {
          id,
          name: pickName(r),
          test_type: r?.test_type ?? r?.mode ?? null,
          is_active: r?.is_active ?? r?.active ?? null,
        };
      })
      .filter(Boolean) as Out[];

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
