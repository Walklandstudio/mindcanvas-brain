// apps/web/app/api/admin/tests/rephrase/question/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";
import OpenAI from "openai";

const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const url = new URL(req.url);
  const questionId = url.searchParams.get("question_id");
  const qnum = Number(url.searchParams.get("q")); // fallback

  const sb = getServiceClient();

  // Try to load from DB by id or qnum; tolerate missing rows
  let qText = "";
  if (questionId) {
    const r = await sb.from("org_test_questions").select("text").eq("id", questionId).maybeSingle();
    if (r.data?.text) qText = r.data.text;
  } else if (Number.isFinite(qnum)) {
    const r = await sb.from("org_test_questions").select("text").eq("qnum", qnum).maybeSingle();
    if (r.data?.text) qText = r.data.text;
  }

  if (!qText) qText = "Rephrase this question clearly while keeping its meaning.";

  const prompt = `Rephrase the following question to match a professional, brand-neutral tone, without changing meaning.
Return JSON: {"text":"<rephrased>"}.

Question: ${qText}`;

  try {
    const resp = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = resp.choices?.[0]?.message?.content || "";
    const parsed = safeJSON(raw);
    const newText = (parsed && typeof parsed.text === "string" && parsed.text.trim()) || qText;

    // Persist only when we have a DB id/qnum
    if (questionId) {
      await sb.from("org_test_questions").update({ text: newText }).eq("id", questionId);
    } else if (Number.isFinite(qnum)) {
      await sb.from("org_test_questions").update({ text: newText }).eq("qnum", qnum);
    }

    return NextResponse.json({ ok: true, text: newText });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}

function safeJSON(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}
