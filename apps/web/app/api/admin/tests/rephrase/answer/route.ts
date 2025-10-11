// apps/web/app/api/admin/tests/rephrase/answer/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const url = new URL(req.url);
  const qnum = Number(url.searchParams.get("q"));
  const ansIdx = Number(url.searchParams.get("a")); // 1..4
  const sb = getServiceClient();

  if (!Number.isFinite(qnum) || !Number.isFinite(ansIdx) || ansIdx < 1 || ansIdx > 4) {
    return NextResponse.json({ error: "q and a required" }, { status: 400 });
    }

  const q = await sb.from("org_test_questions").select("id,text").eq("qnum", qnum).maybeSingle();
  if (q.error || !q.data) return NextResponse.json({ error: q.error?.message || "question not found" }, { status: 404 });

  const ans = await sb
    .from("org_test_answers")
    .select("*")
    .eq("question_id", q.data.id)
    .eq("ordinal", ansIdx)
    .maybeSingle();
  if (ans.error || !ans.data) return NextResponse.json({ error: ans.error?.message || "answer not found" }, { status: 404 });

  const prompt = `
Rephrase the following answer choice to be clearer and brand-neutral, without changing meaning.

Question: ${q.data.text}
Answer: ${ans.data.text}

Return JSON: {"text":"..."}
`;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    const json = JSON.parse(resp.choices[0]?.message?.content || "{}");
    const newText = json.text || ans.data.text;

    const upd = await sb.from("org_test_answers").update({ text: newText }).eq("id", ans.data.id);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: ans.data.id, text: newText });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}
