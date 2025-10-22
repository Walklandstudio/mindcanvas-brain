// apps/web/app/api/portal/people/route.ts
import { NextResponse } from "next/server";
import { getAdminClient, getActiveOrgId } from "@/app/_lib/portal";

export async function GET() {
  try {
    const supabase = await getAdminClient();
    const orgId = await getActiveOrgId(supabase);

    if (!orgId) {
      return NextResponse.json({ people: [], error: "No active org" }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("test_takers")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ people: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
