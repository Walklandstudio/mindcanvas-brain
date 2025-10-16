export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../_lib/supabase";

export async function GET(_: Request, ctx: { params: { slug: string } }) {
  const slug = ctx?.params?.slug;
  if (!slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });

  const sb = getServiceClient();

  // find deployment
  const dep = await sb
    .from("test_deployments")
    .select("id,test_id,title,mode,status")
    .eq("slug", slug)
    .single();

  if (dep.error || !dep.data) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (dep.data.status !== "active") return NextResponse.json({ error: "inactive" }, { status: 403 });

  // fetch questions/answers
  const qs = await sb
    .from("org_test_questions")
    .select("id,qnum,q_no,text")
    .eq("test_id", dep.data.test_id);
  if (qs.error) return NextResponse.json({ error: qs.error.message }, { status: 500 });

  const ids = (qs.data || []).map((r: any) => r.id);
  const ans = await sb
    .from("org_test_answers")
    .select("id,question_id,ordinal,text,points")
    .in("question_id", ids);
  if (ans.error) return NextResponse.json({ error: ans.error.message }, { status: 500 });

  const byQ = new Map<string, any[]>();
  for (const a of (ans.data || [])) {
    const list = byQ.get(a.question_id) || [];
    list.push(a);
    byQ.set(a.question_id, list);
  }

  const items = (qs.data || [])
    .map((q: any) => ({
      id: q.id,
      qnum: q.qnum ?? q.q_no ?? null,
      text: q.text,
      answers: (byQ.get(q.id) || []).sort((a, b) => a.ordinal - b.ordinal),
    }))
    .sort((a, b) => (a.qnum ?? 0) - (b.qnum ?? 0));

  return NextResponse.json({
    title: dep.data.title || "Profile Test",
    mode: dep.data.mode || "full",
    items,
  });
}
