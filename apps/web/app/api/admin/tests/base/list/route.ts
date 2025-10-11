// apps/web/app/api/admin/tests/base/list/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";

export async function GET() {
  const supabase = getServiceClient();
  const qs = await supabase
    .from("base_questions")
    .select("id,qnum,text,base_options(id,onum,text,points,profile_index,frequency)")
    .order("qnum", { ascending: true });
  if (qs.error) return NextResponse.json({ error: qs.error.message }, { status: 500 });
  return NextResponse.json({ items: qs.data ?? [] });
}
