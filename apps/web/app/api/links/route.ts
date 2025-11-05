import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const revalidate = 0;

type TableTarget = { schema: 'portal' | 'public'; table: 'test_links' };

function baseUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL || '';
  if (!url) throw new Error('Missing NEXT_PUBLIC_SITE_URL');
  return url.replace(/\/$/, '');
}

function makeToken(len = 22) {
  // URL-safe token ~22 chars
  return randomBytes(16).toString('base64url').slice(0, len);
}

// Try insert into portal.test_links, then public.test_links
async function insertIntoEitherTable(payload: Record<string, any>) {
  const candidates: TableTarget[] = [
    { schema: 'portal', table: 'test_links' },
    { schema: 'public', table: 'test_links' },
  ];

  for (const target of candidates) {
    const { data, error } = await supabaseAdmin
      .from(`${target.schema}.${target.table}`)
      .insert(payload)
      .select('id, token')
      .single();

    if (!error && data) return { target, data };
  }

  throw new Error('Could not insert into portal.test_links or public.test_links');
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      org_id,
      test_id,
      test_type,            // optional: 'free' | 'paid'
      name = null,
      reason = null,
      send_report = false,
      show_results = true,
      expires_at = null,    // ISO string optional
      max_uses = 1,
      reveal_token = false, // only if admin wants to see it back
    } = body || {};

    if (!org_id || !test_id) {
      return NextResponse.json({ ok: false, error: 'org_id and test_id are required' }, { status: 400 });
    }

    const token = makeToken();
    const payload: any = {
      org_id,
      test_id,
      token,
      max_uses: Number.isFinite(max_uses) ? max_uses : 1,
      name,
      reason,
      send_report: !!send_report,
      show_results: !!show_results,
    };

    if (typeof test_type === 'string') payload.test_type = test_type;
    if (expires_at) payload.expires_at = expires_at;

    const { data } = await insertIntoEitherTable(payload);

    // Only compute linkUrl if we actually need to return it
    const response: any = { ok: true, link_id: data.id };
    if (reveal_token) {
      const url = baseUrl();
      response.link_url = `${url}/t/${data.token}`;
      response.token = data.token;
    }

    return NextResponse.json(response);
  } catch (e: any) {
    console.error('Create link error:', e);
    return NextResponse.json({ ok: false, error: e.message || 'Create link failed' }, { status: 500 });
  }
}
