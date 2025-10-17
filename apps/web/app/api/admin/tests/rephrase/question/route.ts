export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServiceClient } from "../../../../../_lib/supabase";

// TODO: replace with real org resolution (query param, session, etc.)
const ORG_ID = "00000000-0000-0000-0000-000000000001";

/** Small helper to get a tolerant OpenAI client */
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    return new OpenAI({ apiKey });
  } catch {
    return null;
  }
}

/** Try multiple shapes/locations to find onboarding context; fall back safely. */
async function getOnboardingContext(sb: any) {
  const fallback = {
    brandTone: "confident, modern, human",
    industry: "General",
    sector: "General",
    company: "Your Organization",
  };

  try {
    // 1) Newer shape: onboarding steps table with 'goals' JSON
    const s1 = await sb
      .from("onboarding_steps")
      .select("step,data,company,brand_tone,industry,sector")
      .eq("org_id", ORG_ID)
      .order("created_at", { ascending: false })
      .limit(5);
    if (!s1.error && Array.isArray(s1.data)) {
      const goalsRow =
        s1.data.find((r: any) => (r?.step || "").toLowerCase() === "goals") ||
        s1.data[0];

      if (goalsRow) {
        const data = goalsRow.data || {};
        return {
          brandTone:
            goalsRow.brand_tone ||
            data.brandTone ||
            data.brand_tone ||
            fallback.brandTone,
          industry:
            goalsRow.industry || data.industry || fallback.industry,
          sector: goalsRow.sector || data.sector || fallback.sector,
          company:
            goalsRow.company || data.company || data.org || fallback.company,
        };
      }
    }
  } catch {}

  try {
    // 2) Legacy shape: a single onboarding row with JSON
    const s2 = await sb
      .from("org_onboarding")
      .select("data,company,brand_tone,industry,sector")
      .eq("org_id", ORG_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!s2.error && s2.data) {
      const d = s2.data.data || {};
      return {
        brandTone:
          s2.data.brand_tone || d.brandTone || d.brand_tone || fallback.brandTone,
        industry: s2.data.industry || d.industry || fallback.industry,
        sector: s2.data.sector || d.sector || fallback.sector,
        company:
          s2.data.company || d.company || d.org || fallback.company,
      };
    }
  } catch {}

  return fallback;
}

export async function POST(req: Request) {
  const sb = getServiceClient();
  try {
    const body = await req.json().catch(() => ({}));
    const { question_id, text } = body || {};
    if (!question_id || !text) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Load tone & context
    const ctx = await getOnboardingContext(sb);

    // Ask AI to rewrite the text in tone, with light guard rails
    let rewritten = text;
    const ai = getOpenAI();
    if (ai) {
      try {
        const prompt = `
Rewrite the following test question in the brand tone and audience context.

Tone: ${ctx.brandTone}
Company: ${ctx.company}
Industry/Sector: ${ctx.industry}/${ctx.sector}

Rules:
- Keep meaning intact and appropriate for a multiple-choice test.
- Keep it concise and positive.
- Return only the rewritten question, no quotes.

Question: ${text}
        `.trim();

        const resp = await ai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.5,
          messages: [{ role: "user", content: prompt }],
        });
        const out = (resp.choices?.[0]?.message?.content || "").trim();
        if (out) rewritten = out;
      } catch {
        // fall back to the provided text on any AI error
      }
    }

    // Persist
    const update = await sb
      .from("org_test_questions")
      .update({ text: rewritten })
      .eq("id", question_id);

    if (update.error) {
      return NextResponse.json({ error: update.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, text: rewritten });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 },
    );
  }
}
