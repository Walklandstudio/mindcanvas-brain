// apps/web/app/api/admin/tests/rephrase/question/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../../_lib/supabase";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const url = new URL(req.url);
  const qnum = Number(url.searchParams.get("q"));
  const questionId = url.searchParams.get("question_id");

  if (!Number.isFinite(qnum) && !questionId) {
    return NextResponse.json({ error: "question_id or q required" }, { status: 400 });
  }

  const sb = getServiceClient();

  // Try to read the question from DB; if it fails, treat it as ephemeral.
  let qText = "";
  let qId: string | null = null;

  if (questionId) {
    const q = await sb.from("org_test_questions").select("id,text").eq("id", questionId).maybeSingle();
    if (q.data) {
      qText = q.data.text || "";
      qId = q.data.id;
    }
  } else {
    const q = await sb.from("org_test_questions").select("id,text").eq("qnum", qnum).maybeSingle();
    if (q.data) {
      qText = q.data.text || "";
      qId = q.data.id;
    }
  }

  // Fallback text if DB didn't return anything (works with the base/no-DB list)
  if (!qText) {
    // best-effort: infer from the static base list title
    qText = "Rephrase this question for clarity.";
  }

  const prompt = `Rephrase the following question to be clearer and brand-neutral. Keep meaning intact.\n\nQuestion: ${qText}\n\nReturn JSON: {"text":"..."}`;
  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const out = safeParse(resp.choices?.[0]?.message?.content ?? "");
    const newText = out?.text || qText;

    if (qId) {
      const upd = await sb.from("org_test_questions").update({ text: newText }).eq("id", qId);
      if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, text: newText, id: qId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI error" }, { status: 500 });
  }
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}
