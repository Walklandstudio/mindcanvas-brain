// apps/web/app/api/admin/tests/base/rephrase/question/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../../_lib/supabase";
import OpenAI from "openai";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: Request) {
  const supabase = getServiceClient();
  const { question_id } = await req.json().catch(() => ({}));
  if (!question_id) return NextResponse.json({ error: "question_id required" }, { status: 400 });

  const [{ data: ob, error: obErr }, { data: q, error: qErr }] = await Promise.all([
    supabase.from("org_onboarding").select("branding,goals").eq("org_id", ORG_ID).maybeSingle(),
    supabase.from("base_questions").select("id,qnum,text").eq("id", question_id).maybeSingle(),
  ]);
  if (obErr) return NextResponse.json({ error: obErr.message }, { status: 500 });
  if (qErr || !q) return NextResponse.json({ error: qErr?.message || "Question not found" }, { status: 404 });

  const branding = ob?.branding ?? {};
  const goals = ob?.goals ?? {};
  const brandTone = (branding as any)?.brand_voice ?? (branding as any)?.tone ?? "confident, modern, human";
  const industry = (goals as any)?.industry ?? "";
  const sector = (goals as any)?.sector ?? "";
  const primaryGoal = (goals as any)?.primary_goal ?? "";

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const sys = `Rewrite the question to match the client's tone & industry while preserving exact intent. Tone: ${brandTone}. Industry: ${industry}. Sector: ${sector}. Goal: ${primaryGoal}. Return ONLY the rewritten question text.`;
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: q.text },
    ],
  });

  const newText = resp.choices?.[0]?.message?.content?.trim();
  if (!newText) return NextResponse.json({ error: "AI returned empty text" }, { status: 500 });

  const upd = await supabase.from("base_questions").update({ text: newText }).eq("id", q.id);
  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: q.id, text: newText });
}
