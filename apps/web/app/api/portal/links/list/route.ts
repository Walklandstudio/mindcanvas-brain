// apps/web/app/api/portal/links/list/route.ts
import { NextResponse } from "next/server";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export async function GET() {
  try {
    const sb = await getAdminClient();
    const orgId = await getActiveOrgId(sb);
    if (!orgId) return NextResponse.json({ links: [] }, { status: 200 });

    // Pull links for the org (no expires_at column in your schema)
    const { data: links, error } = await sb
      .from("test_links")
      .select("id, token, test_id, use_count, max_uses, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Enrich with test name
    const testIds = Array.from(new Set((links ?? []).map(l => l.test_id).filter(Boolean)));
    let nameById = new Map<string, string>();
    if (testIds.length) {
      const { data: tests } = await sb
        .from("tests")
        .select("id, name")
        .in("id", testIds);
      for (const t of tests ?? []) nameById.set(t.id, t.name ?? "");
    }

    const out = (links ?? []).map(l => ({ ...l, test_name: nameById.get(l.test_id) ?? "" }));
    return NextResponse.json({ links: out }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
