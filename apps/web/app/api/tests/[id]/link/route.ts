import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// export const runtime = 'nodejs'; // optional

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );
}
function userClient(bearer: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: bearer } } }
  );
}
async function getUserId(bearer: string) {
  const u = userClient(bearer);
  const { data } = await u.auth.getUser();
  return data.user?.id ?? null;
}

// Web Crypto token generator (Edge/Node safe)
function makeToken(len = 12) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export async function POST(req: Request, { params }: any) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ ok: false, error: 'missing bearer' }, { status: 401 });
  }

  const url = new URL(req.url);
  const mode = (url.searchParams.get('mode') || 'full').toLowerCase() as 'free' | 'full';
  if (mode !== 'free' && mode !== 'full') {
    return NextResponse.json({ ok: false, error: 'invalid mode' }, { status: 400 });
  }

  const testId = params?.id as string;
  if (!testId) return NextResponse.json({ ok: false, error: 'missing test id' }, { status: 400 });

  const a = admin();

  // ensure test exists
  const { data: test, error: terr } = await a
    .from('tests')
    .select('id')
    .eq('id', testId)
    .single();

  if (terr || !test) {
    return NextResponse.json({ ok: false, error: 'test not found' }, { status: 404 });
  }

  const userId = await getUserId(auth);
  const token = makeToken(12);

  const { data: link, error } = await a
    .from('test_links')
    .insert({ test_id: testId, token, mode, created_by: userId ?? undefined })
    .select('token, mode')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, token: link.token, mode: link.mode });
}
