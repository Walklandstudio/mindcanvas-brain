// apps/web/app/api/admin/tests/base/add/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";

export async function POST(req: Request) {
  const supabase = getServiceClient();
  const body = await req.json().catch(()=> ({}));

  const { text, options, segmentation } = body || {};
  // options: [{onum,text,points,profile_index,frequency}]
  if (!text || !Array.isArray(options) || options.length !== 4) {
    return NextResponse.json({ error: "Provide text and 4 options" }, { status: 400 });
  }

  const maxQ = await supabase
    .from("base_questions")
    .select("qnum")
    .order("qnum",{ascending:false})
    .limit(1);

  const nextQnum = (maxQ.data?.[0]?.qnum ?? 0) + 1;

  const q = await supabase.from("base_questions").insert({ qnum: nextQnum, text, /* optional: store segmentation */ }).select("id").single();
  if (q.error) return NextResponse.json({ error: q.error.message }, { status: 500 });

  const rows = options.map((o:any)=>({
    question_id: q.data.id,
    onum: o.onum,
    text: o.text,
    points: o.points,
    profile_index: o.profile_index,
    frequency: o.frequency
  }));

  const ins = await supabase.from("base_options").insert(rows).select("id");
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, qnum: nextQnum, question_id: q.data.id, segmentation: segmentation ?? null });
}
