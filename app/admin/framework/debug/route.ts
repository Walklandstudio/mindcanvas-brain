// apps/web/app/api/admin/framework/debug/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ensureFrameworkForOrg, DEMO_ORG_ID } from "../../../_lib/framework";

export async function GET() {
  try {
    const data = await ensureFrameworkForOrg(DEMO_ORG_ID);
    return NextResponse.json({ ok: true, ...data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
