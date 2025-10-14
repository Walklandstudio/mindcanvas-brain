// apps/web/app/api/admin/reports/signoff/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST() {
  // For demo flow, just redirect; persist if/when you add a report_meta flag.
  return NextResponse.redirect("/tests", { status: 303 });
}
