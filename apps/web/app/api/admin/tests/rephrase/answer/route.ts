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

  if (!Number.isFinite(qnum) || !Number.isFinite(ansIdx) || ansIdx < 1 || ansIdx > 4) {
    return NextResponse.json({ error: "q and a required (1..4)" }, { status: 400 });
  }

  const sb = getServiceClient();

  // Try DB lookup
  const q = await sb.from("org_test_questions").select("id,text").eq("qnum", qnum).maybeSingle();

  let qText = q.data?.text || "";
  let aText = "";
  let aId: string | null = null;

  if (q.data) {
    const ans = await sb
      .from("org_test_answers")
      .select("id,text")
      .eq("question_id", q.data.id)
      .eq("ordinal", ansIdx)
      .maybeSingle();
    if (ans.data) {
      aText = ans.data.text || "";
      aId = ans.data.id;
    }
  }

  if (!qText) qText = "Question text placeholder.";
  if (!aText) aText = "Answer option placeholder.";

  const prompt = `Rephrase the following answer choice to be clearer and brand-neutral, without changing meaning.\n\nQuestion: ${qText}\nAnswer: ${aText}\n\nReturn JSON: {"text":"..."}`;

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const out = safeParse(resp.choices?.[0]?.message?.content ?? "");
    const newText = out?.text || aText;

    if (aId) {
      const upd = await sb.from("org_test_answers").update({ text: newText }).eq("id", aId);
      if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, text: newText, id: aId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}
