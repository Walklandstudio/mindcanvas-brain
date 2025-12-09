// apps/web/app/api/portal/[slug]/communications/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTemplatedEmail, EmailTemplateType } from '@/lib/server/emailTemplates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function supaAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { db: { schema: 'portal' } });
}

type SendPayload =
  | {
      type: 'send_test_link';
      testId: string;
      takerId: string;
    }
  | {
      type: 'report';
      testId: string;
      takerId: string;
    }
  | {
      type: 'resend_report';
      testId: string;
      takerId: string;
    }
  | {
      type: 'test_owner_notification';
      testId: string;
      takerId: string;
    };

async function getOrgBySlug(slug: string) {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from('orgs')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    throw new Error('ORG_NOT_FOUND');
  }

  return data;
}

async function getTestAndTaker(testId: string, takerId: string) {
  const supa = supaAdmin();
  const { data, error } = await supa
    .from('test_takers')
    .select(
      `
      id,
      email,
      first_name,
      last_name,
      token,
      tests:test_id (
        id,
        name,
        public_result_enabled,
        public_result_path
      )
    `
    )
    .eq('id', takerId)
    .eq('test_id', testId)
    .maybeSingle() as any;

  if (error || !data) {
    throw new Error('TAKER_NOT_FOUND');
  }

  return data;
}

function buildLinks(opts: {
  orgSlug: string;
  testId: string;
  takerToken: string;
}) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL?.startsWith('http')
      ? process.env.NEXT_PUBLIC_VERCEL_URL
      : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`);

  const cleanBase = (baseUrl || '').replace(/\/$/, '');

  // Test link (taking the test)
  const testLink = `${cleanBase}/portal/${opts.orgSlug}/tests/${opts.testId}/take?token=${opts.takerToken}`;

  // Report link (public result)
  const reportLink = `${cleanBase}/t/${opts.takerToken}/report`;

  return { testLink, reportLink };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const body = (await req.json()) as SendPayload;

    const org = await getOrgBySlug(slug);
    const takerRow = await getTestAndTaker(body.testId, body.takerId);

    if (!takerRow.email) {
      return NextResponse.json(
        { error: 'NO_EMAIL', message: 'Test taker has no email address.' },
        { status: 400 }
      );
    }

    const { testLink, reportLink } = buildLinks({
      orgSlug: slug,
      testId: body.testId,
      takerToken: takerRow.token,
    });

    const ctx = {
      first_name: takerRow.first_name || '',
      last_name: takerRow.last_name || '',
      test_name: takerRow.tests?.name || 'your assessment',
      test_link: testLink,
      report_link: reportLink,
      // owner_name can be populated if you join on owner in getTestAndTaker later
      owner_name: '',
    };

    const type: EmailTemplateType = body.type;

    const result = await sendTemplatedEmail({
      orgId: org.id,
      type,
      to: takerRow.email,
      context: ctx,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: 'SEND_FAILED', detail: result },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err: any) {
    console.error('[communications/send] Error', err);
    const msg = typeof err?.message === 'string' ? err.message : 'UNKNOWN';
    const status =
      msg === 'ORG_NOT_FOUND' || msg === 'TAKER_NOT_FOUND' ? 404 : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}
