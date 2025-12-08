// apps/web/app/api/portal/org/profile/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supaServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: 'portal' } });
}

// NOTE: In a real app, you'd resolve org_id based on the authenticated user.
// Here we use slug via search params for simplicity.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Missing org slug' }, { status: 400 });
  }

  const supa = supaServer();
  const { data: org, error } = await supa
    .from('orgs')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !org) {
    console.error('Get org profile error', error);
    return NextResponse.json(
      { error: 'Org not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ org });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing org id' }, { status: 400 });
  }

  const supa = supaServer();

  const { data: org, error } = await supa
    .from('orgs')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !org) {
    console.error('Update org profile error', error);
    return NextResponse.json(
      { error: 'Failed to update org' },
      { status: 500 },
    );
  }

  return NextResponse.json({ org });
}
