// apps/web/app/api/admin/tests/seed-if-empty/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

export async function GET() {
  const supabase = getServiceClient();
  const count = await supabase.from("base_questions").select("id", { count: "exact", head: true });
  if (count.error) return NextResponse.json({ error: count.error.message }, { status: 500 });
  if ((count.count ?? 0) > 0) return NextResponse.json({ ok: true, seeded: false });

  // Call the existing seeder
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/admin/tests/seed-base`, { method: "POST" });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: j.error || "seed-base failed" }, { status: 500 });

  return NextResponse.json({ ok: true, seeded: true, count: j.count });
}
