import 'server-only';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/ai/rephrase
 * Body: {
 *   profileName: string;
 *   sectionTitle: string;         // e.g., "Strengths"
 *   draft?: string;               // existing text (optional)
 *   brand?: {
 *     description?: string;
 *     font?: string;
 *     voice?: string;
 *     colors?: { primary?: string; secondary?: string; accent?: string; background?: string };
 *   };
 *   goals?: {
 *     industry?: string;
 *     sector?: string;
 *     primaryGoal?: string;
 *     missionAlign?: string;
 *     outcomes?: string;
 *     audience?: string;
 *     challenges?: string;
 *     extraInsights?: string;
 *     program?: string;           // standalone or part of program
 *     integration?: string;       // how it integrates
 *     monetization?: string;      // free / paid / tiered
 *     pricePoint?: number;
 *   };
 * }
 *
 * Returns: { text: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      profileName = 'Profile',
      sectionTitle = 'Section',
      draft = '',
      brand = {},
      goals = {},
    } = body ?? {};

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const system = [
      'You are a senior organizational psychologist and report-writer.',
      'Write crisp, helpful, business-ready copy (120–180 words by default).',
      'Prefer active voice. Avoid fluff. Keep sentences varied and readable.',
      'If provided, align with brand voice, colors, and industry context.',
    ].join(' ');

    const context = `
Profile: ${profileName}
Section: ${sectionTitle}

Brand:
- Description: ${brand.description ?? '—'}
- Voice & Tone: ${brand.voice ?? '—'}
- Font: ${brand.font ?? '—'}
- Colors: ${JSON.stringify(brand.colors ?? {})}

Goals / Context:
${Object.entries(goals ?? {})
  .map(([k, v]) => `- ${k}: ${v as string}`)
  .join('\n')}

Existing draft (optional):
${draft || '—'}
`.trim();

    const prompt = `
Write the ${sectionTitle.toLowerCase()} section for the "${profileName}" profile.
- 120–180 words.
- Be concrete and practical.
- Use the brand voice/tone if specified.
- Do not repeat labels; just return the paragraph(s).

Return only the finished text (no markdown).
`.trim();

    // Call OpenAI Chat Completions (works in Node.js runtime)
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: context },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return NextResponse.json({ error: `OpenAI error: ${err || res.statusText}` }, { status: 500 });
    }

    const data = (await res.json()) as any;
    const text =
      data?.choices?.[0]?.message?.content?.trim?.() ||
      'Unable to generate content right now.';

    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad request' }, { status: 400 });
  }
}
