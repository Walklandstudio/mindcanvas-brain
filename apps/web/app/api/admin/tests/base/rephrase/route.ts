// apps/web/app/api/admin/tests/base/rephrase/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";
import OpenAI from "openai";

const ORG_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: Request) {
  const supabase = getServiceClient();

  const { scope } = await req.json().catch(() => ({ scope: "both" }));
  const doQuestions = scope === "both" || scope === "questions";
  const doAnswers = scope === "both" || scope === "answers";

  const [ob, qs] = await Promise.all([
    supabase.from("org_onboarding").select("branding,goals").eq("org_id", ORG_ID).maybeSingle(),
    supabase.from("base_questions").select("id,qnum,text,base_options(id,onum,text,points,profile_index,frequency)").order("qnum",{ascending:true})
  ]);
  if (ob.error) return NextResponse.json({ error: ob.error.message }, { status: 500 });
  if (qs.error) return NextResponse.json({ error: qs.error.message }, { status: 500 });

  const branding = ob.data?.branding ?? {};
  const goals = ob.data?.goals ?? {};
  const brandTone = (branding as any)?.brand_voice ?? (branding as any)?.tone ?? "confident, modern, human";
  const industry = (goals as any)?.industry ?? "";
  const sector = (goals as any)?.sector ?? "";
  const primaryGoal = (goals as any)?.primary_goal ?? "";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
  const openai = new OpenAI({ apiKey });

  const sys = `You rewrite survey content to match a client's tone and industry while preserving meaning.
Rules:
- Maintain EXACT intent and scoring semantics.
- For answers: DO NOT change which option is higher/lower intensity; preserve relative strength and connotation.
- Tone: ${brandTone}. Industry: ${industry}. Sector: ${sector}. Primary goal: ${primaryGoal}.
Return JSON with {questions:[{id,qnum,text,options:[{id,onum,text}]}]}.`;

  const user = {
    questions: (qs.data ?? []).map((q:any)=>({
      id: q.id,
      qnum: q.qnum,
      text: doQuestions ? q.text : undefined,
      options: (q.base_options ?? []).map((o:any)=>({
        id: o.id,
        onum: o.onum,
        text: doAnswers ? o.text : undefined
      }))
    }))
  };

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: JSON.stringify(user) }
    ],
    response_format: { type: "json_object" }
  });

  let out: any = {};
  try { out = JSON.parse(resp.choices[0].message?.content || "{}"); } catch {}
  const items: any[] = out.questions || [];

  // Apply updates (only text fields)
  for (const q of items) {
    if (doQuestions && q.text) {
      await supabase.from("base_questions").update({ text: String(q.text).trim() }).eq("id", q.id);
    }
    if (Array.isArray(q.options)) {
      for (const o of q.options) {
        if (doAnswers && o.text) {
          await supabase.from("base_options").update({ text: String(o.text).trim() }).eq("id", o.id);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, updated_questions: items.length });
}
