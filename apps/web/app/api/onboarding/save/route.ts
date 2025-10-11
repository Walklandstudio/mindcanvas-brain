import { NextResponse } from "next/server";
import { getServiceClient } from "../../../_lib/supabase";

type Step = "create_account" | "company" | "branding" | "goals";

export async function POST(req: Request) {
  const body = await req.json();
  const step: Step = body?.step;
  const payload = body?.data ?? {};
  if (!step) return NextResponse.json({ error: "Missing step" }, { status: 400 });

  const supabase = getServiceClient();
  const demoOrgId = "00000000-0000-0000-0000-000000000001";

  // 1) Ensure organizations row exists
  {
    const { error: orgErr } = await supabase
      .from("organizations")
      .upsert({ id: demoOrgId, name: "Demo Org" }, { onConflict: "id" });
    if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });
  }

  // 2) Upsert onboarding
  const { error } = await supabase
    .from("org_onboarding")
    .upsert({ org_id: demoOrgId, [step]: payload }, { onConflict: "org_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
