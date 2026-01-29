// app/api/tests/[testId]/links/route.ts
import { NextRequest } from 'next/server';
import { sbAdmin } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Simple token generator
function genToken(len = 16) {
  const alpha =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++)
    s += alpha[Math.floor(Math.random() * alpha.length)];
  return s;
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET → list links for a test
 * POST → create a link for a test (body: { label?: string; max_uses?: number | null })
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { testId: string } }
) {
  const testId = params.testId;
  if (!testId) return json(400, { ok: false, error: 'missing_test_id' });

  const db = sbAdmin.schema('portal');

  // verify test exists & fetch org_id for convenience in UI
  const t = await db
    .from('tests')
    .select('id, org_id, name')
    .eq('id', testId)
    .maybeSingle();
  if (t.error)
    return json(200, {
      ok: false,
      stage: 'test_lookup',
      error: t.error.message,
    });
  if (!t.data)
    return json(200, {
      ok: false,
      stage: 'test_lookup',
      error: 'test_not_found',
    });

  const links = await db
    .from('test_links')
    .select('id, token, label, max_uses, use_count, created_at')
    .eq('test_id', testId)
    .order('created_at', { ascending: false });

  if (links.error)
    return json(200, {
      ok: false,
      stage: 'link_list',
      error: links.error.message,
    });

  return json(200, { ok: true, test: t.data, links: links.data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { testId: string } }
) {
  const testId = params.testId;
  if (!testId) return json(400, { ok: false, error: 'missing_test_id' });

  const db = sbAdmin.schema('portal');

  const body = (await req.json().catch(() => ({}))) as {
    max_uses?: number | null;
    label?: string | null;
  };

  const max_uses =
    typeof body?.max_uses === 'number' ? body.max_uses : null;
  const label =
    typeof body?.label === 'string'
      ? body.label.trim() || null
      : null;

  // 1) test -> org_id
  const t = await db
    .from('tests')
    .select('id, org_id')
    .eq('id', testId)
    .maybeSingle();
  if (t.error)
    return json(200, {
      ok: false,
      stage: 'test_lookup',
      error: t.error.message,
    });
  if (!t.data)
    return json(200, {
      ok: false,
      stage: 'test_lookup',
      error: 'test_not_found',
    });

  // 2) insert link
  const token = genToken(12);
  const ins = await db
    .from('test_links')
    .insert({
      id: crypto.randomUUID(),
      org_id: t.data.org_id, // required
      test_id: testId,
      token,
      max_uses,
      use_count: 0,
      label, // 🆕 store the human-friendly name
    })
    .select('id, token, label, max_uses, use_count, created_at')
    .single();

  if (ins.error)
    return json(200, {
      ok: false,
      stage: 'insert_link',
      error: ins.error.message,
    });

  // Return the full link row for the UI
  return json(200, { ok: true, link: ins.data });
}
