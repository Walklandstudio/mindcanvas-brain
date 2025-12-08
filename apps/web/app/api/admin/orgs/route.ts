// apps/web/app/api/admin/orgs/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function supaAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { db: { schema: 'portal' } });
}

export async function POST(req: Request) {
  const body = await req.json();
  const supa = supaAdmin();

  // TODO: replace with your real super-admin auth check
  // if (!isSuperAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const {
    name,
    slug,
    industry,
    short_bio,
    time_zone,
    logo_url,
    brand_primary,
    brand_secondary,
    brand_background,
    brand_text,
    brand_accent,
    primary_contact_name,
    primary_contact_email,
    support_email,
    website_url,
    phone_number,
    report_from_name,
    report_from_email,
    report_signoff_line,
    report_footer_notes,
    owner_auth_user_id,
  } = body;

  const { data: org, error } = await supa
    .from('orgs')
    .insert({
      name,
      slug,
      industry,
      short_bio,
      time_zone,
      logo_url,
      brand_primary,
      brand_secondary,
      brand_background,
      brand_text,
      brand_accent,
      primary_contact_name,
      primary_contact_email,
      support_email,
      website_url,
      phone_number,
      report_from_name,
      report_from_email,
      report_signoff_line,
      report_footer_notes,
    })
    .select('*')
    .single();

  if (error || !org) {
    console.error('Create org error', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create org' },
      { status: 500 },
    );
  }

  if (owner_auth_user_id) {
    const { error: linkError } = await supa.from('org_users').insert({
      org_id: org.id,
      user_id: owner_auth_user_id,
      role: 'owner',
    });

    if (linkError) {
      console.error('Link owner error', linkError);
      // continue; org exists even if mapping fails
    }
  }

  return NextResponse.json({ org });
}

