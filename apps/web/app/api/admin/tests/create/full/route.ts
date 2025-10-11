// apps/web/app/api/admin/tests/create/full/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: true, redirect: "/admin/reports/signoff" });
}
