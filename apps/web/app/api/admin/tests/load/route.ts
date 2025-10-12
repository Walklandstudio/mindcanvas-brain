// apps/web/app/api/admin/tests/load/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const sb = getServiceClient();

  // Get latest test for org (or any test)
  const test = await sb
    .from("org_tests")
    .select("id")
    .eq("org_id", ORG_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (test.error) return NextResponse.json({ error: test.error.message }, { status: 500 });
  if (!test.data) return NextResponse.json({ items: [] });

  const qs = await sb
    .from("org_test_questions")
    .select("id,qnum,text")
    .eq("test_id", test.data.id)
    .order("qnum", { ascending: true });

  if (qs.error) return NextResponse.json({ error: qs.error.message }, { status: 500 });

  const qids = (qs.data || []).map((q: any) => q.id);
  const ans = await sb
    .from("org_test_answers")
    .select("id,question_id,text,ordinal")
    .in("question_id", qids);

  if (ans.error) return NextResponse.json({ error: ans.error.message }, { status: 500 });

  const answersByQ = new Map<string, any[]>();
  (ans.data || []).forEach((a: any) => {
    const arr = answersByQ.get(a.question_id) || [];
    arr.push(a);
    answersByQ.set(a.question_id, arr);
  });

  const items = (qs.data || []).map((q: any) => ({
    id: q.id,
    qnum: q.qnum,
    text: q.text,
    answers: answersByQ.get(q.id) || [],
  }));

  return NextResponse.json({ items });
}
