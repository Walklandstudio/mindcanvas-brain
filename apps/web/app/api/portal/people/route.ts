// apps/web/app/api/portal/people/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase, ensurePortalMember } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ✅ actually await the client
    const sb = await getServerSupabase();

    // ✅ ensure the caller belongs to an org; returns the resolved orgId
    const orgId = await ensurePortalMember(sb);

    // ✅ query people (test_takers) for this org
    const { data, error } = await sb
      .from("test_takers")
      .select(
        [
          "id",
          "first_name",
          "last_name",
          "email",
          "phone",
          "company",
          "team",
          "team_function",
          "created_at",
          "test_id",
          "token",
        ].join(",")
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, orgId, people: data ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
