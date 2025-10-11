import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = getServiceClient();
  const body = await req.json();
  const answers: Record<string, number> = body?.answers || {}; // { org_test_questions.id : onum }

  const { data: test, error: tErr } = await supabase
    .from("org_tests")
    .select("id,mode")
    .eq("id", params.id)
    .maybeSingle();
  if (tErr || !test) return NextResponse.json({ error: tErr?.message || "Test not found" }, { status: 404 });

  const { data: qs, error: qErr } = await supabase
    .from("org_test_questions")
    .select("id,options")
    .eq("test_id", test.id);
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  let total = 0;
  const freqTotals: Record<"A"|"B"|"C"|"D", number> = { A:0, B:0, C:0, D:0 };
  const profileTotals: Record<number, number> = { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0 };

  for (const q of qs) {
    const onum = answers[q.id];
    if (!onum) continue;
    const opt = (q.options as any[]).find((o) => o.onum === onum);
    if (!opt) continue;
    total += opt.points;
    freqTotals[opt.frequency as "A"|"B"|"C"|"D"] += opt.points;
    profileTotals[opt.profile as number] += opt.points;
  }

  // Pick top frequency and profile
  const freq = Object.entries(freqTotals).sort((a,b)=>b[1]-a[1])[0]?.[0] as "A"|"B"|"C"|"D";
  const profileIndex = Object.entries(profileTotals).sort((a,b)=>b[1]-a[1])[0]?.[0];

  const out: any = { total, frequency: freq };
  if (test.mode === "full") out.profile = `Profile ${profileIndex}`;

  return NextResponse.json(out);
}
