// apps/web/app/api/admin/tests/rephrase/question/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";
import { suggestFrameworkNames } from "../../../../../_lib/ai"; // not used, but left if you later want tone from onboarding
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const url = new URL(req.url);
  const qnum = Number(url.searchParams.get("q"));
  const questionId = url.searchParams.get("question_id");

  const sb = getServiceClient();

  let question: any = null;

  if (questionId) {
    const q = await sb.from("org_test_questions").select("*").eq("id", questionId).single();
    if (q.error) return NextResponse.json({ error: q.error.message }, { status: 400 });
    question = q.data;
  } else if (!Number.isFinite(qnum)) {
    return NextResponse.json({ error: "question_id or q required" }, { status: 400 });
  } else {
    const q = await sb.from("org_test_questions").select("*").eq("qnum", qnum).maybeSingle();
    if (q.error || !q.data) return NextResponse.json({ error: q.error?.message || "question not found" }, { status: 404 });
    question = q.data;
  }

  const answers = await sb.from("org_test_answers")
    .select("id,ordinal,text,points,frequency,profile_index")
    .eq("question_id", question.id)
    .order("ordinal", { ascending: true });
  if (answers.error) return NextResponse.json({ error: answers.error.message }, { status: 400 });

  const prompt = `
Rephrase the following question to be clearer and brand-neutral. Keep meaning intact.

Question: ${question.text}

Return JSON: {"text":"..."}
`;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });
    const json = JSON.parse(resp.choices[0]?.message?.content || "{}");
    const newText = json.text || question.text;

    const upd = await sb.from("org_test_questions").update({ text: newText }).eq("id", question.id);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: question.id, text: newText });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}
