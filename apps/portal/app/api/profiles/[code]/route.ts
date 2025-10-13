// app/api/profiles/[code]/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

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
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;

  const { data, error } = await supabase
    .from('mc_profiles')
    .select(
      'code, name, flow, overview, strengths, watchouts, tips, welcome_long, introduction_long, competencies_long, brand_color, image_url'
    )
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load profile', details: error.message },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json(data as ProfileRow, { status: 200 });
}
