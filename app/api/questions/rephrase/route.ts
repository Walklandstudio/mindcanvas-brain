import { NextResponse } from 'next/server';

// Uses OpenAI Responses API (stream off)
export async function POST(req: Request) {
  const { prompt } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 });

  const body = {
    model: 'gpt-4o-mini',
    input: `Rephrase this question in plain, clear English for a professional audience.
- Keep meaning identical.
- Keep it neutral and concise (max 20 words).
Question: "${prompt}"`,
  };

  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text();
    return NextResponse.json({ error: t }, { status: 500 });
  }
  const data = await r.json();
  const text = data?.output?.[0]?.content?.[0]?.text ?? data?.choices?.[0]?.text ?? '';
  return NextResponse.json({ rephrased: text.trim() });
}
