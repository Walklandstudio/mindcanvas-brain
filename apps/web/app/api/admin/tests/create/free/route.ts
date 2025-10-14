// apps/web/app/api/admin/tests/create/free/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * For demo flow: acknowledge and send the user to Report Sign-off.
 * Replace with real persistence when your org_tests wiring is ready.
 */
export async function POST() {
  return NextResponse.json({ ok: true, redirect: "/admin/reports/signoff" });
}
