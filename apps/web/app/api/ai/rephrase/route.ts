import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text, tone } = await req.json();
  // Lightweight “rephrase”: adjust tone a bit. Replace with real LLM later.
  const t = (tone ?? 'friendly').toLowerCase();
  const prefix =
    t.includes('professional') ? 'Professional and concise: ' :
    t.includes('playful') ? 'Playful and engaging: ' :
    t.includes('confident') ? 'Confident and direct: ' :
    'Clear and friendly: ';
  return NextResponse.json({ text: `${prefix}${text || 'Clear, helpful report copy.'}` });
}
