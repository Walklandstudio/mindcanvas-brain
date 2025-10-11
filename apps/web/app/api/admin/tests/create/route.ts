// apps/web/app/api/admin/tests/create/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: Request) {
  const supabase = getServiceClient();
  const { mode } = await req.json().catch(()=>({mode:"full"}));
  if (!["free","full"].includes(mode)) {
    return NextResponse.json({ error: "mode must be 'free' or 'full'" }, { status: 400 });
  }

  await supabase.from("organizations").upsert(
    { id: ORG_ID, name: "Demo Org" },
    { onConflict: "id" }
  );

  // Create test row
  const t = await supabase
    .from("org_tests")
    .insert({ org_id: ORG_ID, name: mode === "free" ? "Signature Free Test" : "Signature Full Test", mode })
    .select("id")
    .single();
  if (t.error) return NextResponse.json({ error: t.error.message }, { status: 500 });

  // Get base questions
  const qsel = await supabase
    .from("base_questions")
    .select("id,qnum,text,base_options(id,onum,text,points,profile_index,frequency)")
    .order("qnum", { ascending: true });
  if (qsel.error) return NextResponse.json({ error: qsel.error.message }, { status: 500 });

  const base = qsel.data ?? [];
  const chosen = mode === "free" ? base.slice(0, 7) : base.slice(0, 15);

  let ordinal = 1;
  const rows = chosen.map((q:any)=>({
    test_id: t.data.id,
    qnum: q.qnum,
    ordinal: ordinal++,
    text: q.text,
    options: (q.base_options ?? []).map((o:any)=>({
      onum: o.onum,
      text: o.text,
      points: o.points,
      profile: o.profile_index,
      frequency: o.frequency
    }))
  }));

  const ins = await supabase.from("org_test_questions").insert(rows).select("id");
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, test_id: t.data.id, count: rows.length });
}
