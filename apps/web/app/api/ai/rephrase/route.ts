// apps/web/app/api/ai/rephrase/route.ts
function expandContractions(s: string) { return s; }

import { NextResponse } from 'next/server';
import { getOwnerOrgAndFramework } from '../../_lib/org';

export const runtime = 'nodejs';

type Tone = 'friendly' | 'formal' | 'concise';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = (body?.text ?? '') as string;
    const tone = (body?.tone ?? 'friendly') as Tone;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ ok: false, error: 'Provide { text }' }, { status: 400 });
    }

    // Sanity check org/framework exists (ensures caller is set up)
    await getOwnerOrgAndFramework();

    const rewritten = rephrase(text, tone);
    return NextResponse.json({ ok: true, text: rewritten });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 });
  }
}

/** Lightweight local “AI” rewrite to keep builds/tooling simple for now. */
function rephrase(input: string, tone: Tone): string {
  let s = normalizeWhitespace(input);

  switch (tone) {
    case 'formal':
      s = expandContractions(s);
      s = replaceMany(s, [
        [' wanna ', ' want to '],
        [' gonna ', ' going to '],
        [' kinda ', ' somewhat '],
        [' sorta ', ' somewhat '],
      ]);
      break;

    case 'concise':
      s = replaceMany(s, [
        [' in order to ', ' to '],
        [' basically ', ' '],
        [' actually ', ' '],
        [' really ', ' '],
        [' very ', ' '],
        [' just ', ' '],
      ]);
      // trim filler starts
      s = s.replace(/^(Well|So|Basically|Actually),?\s+/i, '');
      break;

    case 'friendly':
    default:
      s = replaceMany(s, [
        [' cannot ', " can't "],
        [' do not ', " don't "],
        [' will not ', " won't "],
      ]);
      break;
  }

  // Capitalize first letter & ensure trailing period if missing
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]"?\s*$/.test(s)) s += '.';
  return s.trim();
}

function normalizeWhitespace(s: string) {
  return (' ' + s.replace(/\s+/g, ' ').trim() + ' ');
}

function replaceMany(s: string, pairs: [string, string][]) {
  for (const [from, to] of pairs) {
    const re = new RegExp(escapeRegExp(from), 'gi');
    s = s.replace(re, to);
  }
  return s;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
