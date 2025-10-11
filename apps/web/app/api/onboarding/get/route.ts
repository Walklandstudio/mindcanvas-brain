// apps/web/app/api/onboarding/get/route.ts
import { NextResponse } from "next/server";
import { getServiceClient } from "../../../_lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const step = searchParams.get("step") as "create_account" | "company" | "branding" | "goals";
  if (!step) return NextResponse.json({ error: "Missing step" }, { status: 400 });

  const supabase = getServiceClient();
  // For demo: single org row. Replace with auth-bound org_id when multi-tenant auth lands.
  const { data, error } = await supabase
    .from("org_onboarding")
    .select(step)
    .limit(1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data?.[step] ?? {} });
}
