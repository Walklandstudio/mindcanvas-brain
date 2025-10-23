// apps/web/app/api/portal/export/submissions.csv/route.ts
import { NextResponse } from 'next/server';
import { getServerSupabase, getActiveOrgId } from '@/app/_lib/portal';

export const runtime = 'nodejs';

function csvEscape(v: any) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  try {
    const sb = await getServerSupabase();
    const orgId = await getActiveOrgId(sb);
    if (!orgId) {
      return new NextResponse('No active org', { status: 400 });
    }

    const url = new URL(req.url);
    const testId = url.searchParams.get('testId');
    const from = url.searchParams.get('from'); // ISO date
    const to = url.searchParams.get('to');     // ISO date

    let query = sb
      .from('test_submissions')
      .select('id, created_at, taker_email, taker_name, profile, frequency, total_points, link_token, test_id')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (testId) query = query.eq('test_id', testId);
    if (from) query = query.gte('created_at', from);
    if (to)   query = query.lte('created_at', to);

    const { data, error } = await query.limit(5000);
    if (error) {
      return new NextResponse(`Error: ${error.message}`, { status: 500 });
    }

    const header = [
      'id','created_at','taker_name','taker_email','profile','frequency','total_points','link_token','test_id'
    ];
    const lines = [
      header.join(','),
      ...(data ?? []).map(r =>
        [
          r.id,
          r.created_at,
          r.taker_name,
          r.taker_email,
          r.profile,
          r.frequency,
          r.total_points ?? '',
          r.link_token,
          r.test_id,
        ].map(csvEscape).join(',')
      )
    ];

    const csv = lines.join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="submissions.csv"',
      },
    });
  } catch (e: any) {
    return new NextResponse(`Error: ${e?.message || e}`, { status: 500 });
  }
}
