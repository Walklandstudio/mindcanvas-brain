// app/api/admin/profiles/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ProfileCode = 'P1'|'P2'|'P3'|'P4'|'P5'|'P6'|'P7'|'P8';

interface ProfileRow {
  code: ProfileCode;
  name: string;
  flow: string;
  overview: string | null;
  strengths: string[] | null;
  watchouts: string[] | null;
  tips: string[] | null;
  welcome_long: string | null;
  introduction_long: string | null;
  competencies_long: string | null;
  brand_color: string | null;
  image_url: string | null;
  updated_at?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-only service key client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function hasAdminCookie(req: NextRequest): boolean {
  return Boolean(req.cookies.get('admin_token')?.value);
}

/** GET: list profiles */
export async function GET(req: NextRequest) {
  if (!hasAdminCookie(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('mc_profiles')
    .select(
      'code,name,flow,overview,strengths,watchouts,tips,welcome_long,introduction_long,competencies_long,brand_color,image_url,updated_at'
    )
    .order('code');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data as ProfileRow[], { status: 200 });
}

/** PUT: upsert array of profiles */
export async function PUT(req: NextRequest) {
  if (!hasAdminCookie(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as unknown;

  if (!Array.isArray(payload)) {
    return NextResponse.json({ error: 'Expected an array of profiles' }, { status: 400 });
  }

  const rows: ProfileRow[] = [];
  for (const item of payload) {
    if (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).code === 'string' &&
      typeof (item as Record<string, unknown>).name === 'string'
    ) {
      rows.push(item as ProfileRow);
    } else {
      return NextResponse.json({ error: 'Invalid profile row in payload' }, { status: 400 });
    }
  }

  const { error } = await supabase.from('mc_profiles').upsert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: rows.length }, { status: 200 });
}
