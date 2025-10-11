// apps/web/app/api/admin/tests/create/full/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function POST() {
  const sb = getServiceClient();

  // 1) create a test row
  const test = await sb.from("org_tests").insert({ org_id: ORG_ID, kind: "full" }).select("id").single();
  if (test.error) return NextResponse.json({ error: test.error.message }, { status: 500 });

  // 2) copy base questions/answers into org_test_questions/answers (assuming you stored them)
  // This is a placeholder. If you already have a seeder, call it here.
  // Ensure at minimum each inserted question has qnum + text set.

  // 3) respond with a redirect path the client can follow
  return NextResponse.json({ ok: true, redirect: "/admin/reports/signoff" });
}
