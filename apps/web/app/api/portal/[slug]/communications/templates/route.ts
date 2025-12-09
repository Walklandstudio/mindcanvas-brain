// apps/web/app/api/portal/[slug]/communication/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  EmailTemplateType,
  getDefaultTemplate,
} from '@/lib/server/emailTemplates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function supaAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { db: { schema: 'portal' } });
}

type TemplateRow = {
  type: EmailTemplateType;
  subject: string;
  body_html: string;
};

async function getOrgBySlug(slug: string) {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from('orgs')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) throw new Error('ORG_NOT_FOUND');
  return data;
}

const ALL_TYPES: EmailTemplateType[] = [
  'report',
  'test_owner_notification',
  'resend_report',
  'send_test_link',
];

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const org = await getOrgBySlug(slug);

    const supa = supaAdmin();
    const { data, error } = await supa
      .from('email_templates')
      .select('type, subject, body_html')
      .eq('org_id', org.id);

    if (error) throw error;

    const map = new Map<string, TemplateRow>();
    (data || []).forEach((row: any) => {
      map.set(row.type, {
        type: row.type,
        subject: row.subject,
        body_html: row.body_html,
      });
    });

    const rows: TemplateRow[] = ALL_TYPES.map((t) => {
      const existing = map.get(t);
      if (existing) return existing;
      const def = getDefaultTemplate(t);
      return { type: t, subject: def.subject, body_html: def.bodyHtml };
    });

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('[communication/templates] GET error', err);
    const msg = typeof err?.message === 'string' ? err.message : 'UNKNOWN';
    const status = msg === 'ORG_NOT_FOUND' ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = (await req.json()) as { templates: TemplateRow[] };
    const org = await getOrgBySlug(slug);
    const supa = supaAdmin();

    const payload = body.templates.map((t) => ({
      org_id: org.id,
      type: t.type,
      subject: t.subject,
      body_html: t.body_html,
    }));

    const { error } = await supa.from('email_templates').upsert(payload, {
      onConflict: 'org_id, type',
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[communication/templates] POST error', err);
    const msg = typeof err?.message === 'string' ? err.message : 'UNKNOWN';
    const status = msg === 'ORG_NOT_FOUND' ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
