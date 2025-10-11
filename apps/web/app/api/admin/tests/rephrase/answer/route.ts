// apps/web/app/api/admin/tests/rephrase/answer/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";
import OpenAI from "openai";

const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const url = new URL(req.url);
  const answerId = url.searchParams.get("answer_id");
  const qnum = Number(url.searchParams.get("q"));
  const ansOrdinal = Number(url.searchParams.get("a")); // 1..4

  if (!answerId && (!Number.isFinite(qnum) || !Number.isFinite(ansOrdinal))) {
    return NextResponse.json({ error: "answer_id or (q & a) required" }, { status: 400 });
  }

  const sb = getServiceClient();

  // Load text (tolerant)
  let qText = "Question text placeholder.";
  let aText = "Answer option placeholder.";

  if (answerId) {
    const ans = await sb.from("org_test_answers").select("text,question_id").eq("id", answerId).maybeSingle();
    if (ans.data?.text) aText = ans.data.text;
    if (ans.data?.question_id) {
      const q = await sb.from("org_test_questions").select("text").eq("id", ans.data.question_id).maybeSingle();
      if (q.data?.text) qText = q.data.text;
    }
  } else {
    const q = await sb.from("org_test_questions").select("id,text").eq("qnum", qnum).maybeSingle();
    if (q.data?.text) qText = q.data.text;
    if (q.data?.id) {
      const a = await sb
        .from("org_test_answers")
        .select("id,text")
        .eq("question_id", q.data.id)
        .eq("ordinal", ansOrdinal)
        .maybeSingle();
      if (a.data?.text) aText = a.data.text;
    }
  }

  const prompt = `Rephrase the answer choice to match a professional, brand-neutral tone, without changing its meaning.
Return JSON: {"text":"<rephrased>"}.

Question: ${qText}
Answer: ${aText}`;

  try {
    const resp = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = resp.choices?.[0]?.message?.content || "";
    const parsed = safeJSON(raw);
    const newText = (parsed && typeof parsed.text === "string" && parsed.text.trim()) || aText;

    if (answerId) {
      await sb.from("org_test_answers").update({ text: newText }).eq("id", answerId);
    } else if (Number.isFinite(qnum) && Number.isFinite(ansOrdinal)) {
      const q = await sb.from("org_test_questions").select("id").eq("qnum", qnum).maybeSingle();
      if (q.data?.id) {
        await sb
          .from("org_test_answers")
          .update({ text: newText })
          .eq("question_id", q.data.id)
          .eq("ordinal", ansOrdinal);
      }
    }

    return NextResponse.json({ ok: true, text: newText });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}

function safeJSON(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}
