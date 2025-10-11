// apps/web/app/api/onboarding/get/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const VALID_STEPS = new Set(["create_account", "company", "branding", "goals"]);

export async function GET(req: Request) {
  const supabase = getServiceClient();

  const url = new URL(req.url);
  const step = url.searchParams.get("step") || "";
  if (!VALID_STEPS.has(step)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  // Ensure org & onboarding rows exist (idempotent; no .catch() chains)
  await supabase.from("organizations").upsert(
    { id: ORG_ID, name: "Demo Org" },
    { onConflict: "id" }
  );

  await supabase.from("org_onboarding").upsert(
    { org_id: ORG_ID }, // defaults handled by DB
    { onConflict: "org_id" }
  );

  // Fetch the specific step JSON
  const sel = await supabase
    .from("org_onboarding")
    .select(`${step}`)
    .eq("org_id", ORG_ID)
    .maybeSingle();

  if (sel.error) {
    return NextResponse.json({ error: sel.error.message }, { status: 500 });
  }

  const payload = (sel.data as any)?.[step] ?? {};
  return NextResponse.json({ data: payload });
}
