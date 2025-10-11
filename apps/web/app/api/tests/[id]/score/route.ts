// apps/web/app/api/tests/[id]/score/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getServiceClient();
  const { id } = params;

  // read submitted answers
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const answers: Record<string, number> = body?.answers || {}; // { org_test_questions.id : onum }

  // fetch test meta
  const { data: test, error: tErr } = await supabase
    .from("org_tests")
    .select("id,mode")
    .eq("id", id)
    .maybeSingle();

  if (tErr || !test) {
    return NextResponse.json(
      { error: tErr?.message || "Test not found" },
      { status: 404 }
    );
  }

  // fetch test questions + options
  const { data: qs, error: qErr } = await supabase
    .from("org_test_questions")
    .select("id,options")
    .eq("test_id", test.id);

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  let total = 0;
  const freqTotals: Record<"A" | "B" | "C" | "D", number> = { A: 0, B: 0, C: 0, D: 0 };
  const profileTotals: Record<number, number> = { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0 };

  for (const q of qs ?? []) {
    const onum = answers[q.id];
    if (!onum) continue;
    const opt = (q.options as any[]).find((o) => o.onum === onum);
    if (!opt) continue;
    total += opt.points;
    freqTotals[opt.frequency as "A"|"B"|"C"|"D"] += opt.points;
    profileTotals[opt.profile as number] += opt.points;
  }

  const topFreq =
    (Object.entries(freqTotals).sort((a, b) => b[1] - a[1])[0]?.[0] as
      | "A" | "B" | "C" | "D") || null;

  const topProfileIndex =
    Number(Object.entries(profileTotals).sort((a, b) => b[1] - a[1])[0]?.[0]) || null;

  const out: any = { total, frequency: topFreq };
  if (test.mode === "full" && topProfileIndex) out.profile = `Profile ${topProfileIndex}`;

  return NextResponse.json(out);
}
