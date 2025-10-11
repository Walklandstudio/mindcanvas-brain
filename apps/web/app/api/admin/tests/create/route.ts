// apps/web/app/api/admin/tests/create/route.ts
import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: Request) {
  const { mode } = await req.json(); // 'free' | 'full'
  if (!["free","full"].includes(mode)) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  const supabase = getServiceClient();

  const { data: test, error: tErr } = await supabase
    .from("org_tests")
    .insert({ org_id: ORG_ID, name: `Signature (${mode})`, mode })
    .select("id")
    .single();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const { data: baseQs, error: bErr } = await supabase
    .from("base_questions")
    .select("id,qnum,text,base_options(id,onum,text,points,profile_index,frequency)")
    .order("qnum", { ascending: true });
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  const picked = mode === "free" ? baseQs.slice(0, 7) : baseQs;

  let ordinal = 1;
  for (const q of picked) {
    const options = (q as any).base_options.map((o: any) => ({
      onum: o.onum, text: o.text, points: o.points, profile: o.profile_index, frequency: o.frequency,
    }));
    const { error: insErr } = await supabase.from("org_test_questions").insert({
      test_id: test.id,
      qnum: q.qnum,
      text: q.text,
      options,
      ordinal: ordinal++,
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, test_id: test.id, count: picked.length });
}
