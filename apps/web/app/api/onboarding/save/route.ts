// apps/web/app/api/onboarding/save/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const VALID_STEPS = new Set(["create_account", "company", "branding", "goals"]);

export async function POST(req: Request) {
  const supabase = getServiceClient();

  let body: any = {};
  try { body = await req.json(); } catch {}
  const { step, data } = body || {};
  if (!VALID_STEPS.has(step)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  await supabase.from("organizations").upsert(
    { id: ORG_ID, name: "Demo Org" },
    { onConflict: "id" }
  );
  await supabase.from("org_onboarding").upsert(
    { org_id: ORG_ID },
    { onConflict: "org_id" }
  );

  const patch: Record<string, unknown> = {};
  patch[step] = data || {};

  const upd = await supabase
    .from("org_onboarding")
    .update(patch)
    .eq("org_id", ORG_ID);

  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
