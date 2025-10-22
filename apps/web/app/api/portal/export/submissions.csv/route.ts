// apps/web/app/api/portal/export/submissions.csv/route.ts
import { NextResponse } from 'next/server';
import { getAdminClient, getActiveOrgId } from '@/app/_lib/portal';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const testId = url.searchParams.get('testId') || undefined;
  const from = url.searchParams.get('from') || undefined;
  const to = url.searchParams.get('to') || undefined;

  const sb = await getAdminClient();
  const orgId = await getActiveOrgId(sb);
  if (!orgId) return NextResponse.json({ error: 'No active org' }, { status: 400 });

  let q = sb.from('test_submissions')
    .select('created_at, test_id, link_token, taker_email, taker_name, total_points, frequency, profile, answers')
    .eq('org_id', orgId);

  if (testId) q = q.eq('test_id', testId);
  if (from)  q = q.gte('created_at', from);
  if (to)    q = q.lte('created_at', to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = ['created_at','test_id','link_token','taker_email','taker_name','total_points','frequency','profile','answers_json'];
  const rows = [headers.join(',')].concat(
    (data ?? []).map(r => [
      r.created_at, r.test_id, r.link_token, r.taker_email ?? '', r.taker_name ?? '',
      r.total_points ?? '', r.frequency ?? '', r.profile ?? '', JSON.stringify(r.answers ?? {})
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
  );
  const csv = rows.join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="submissions.csv"',
    },
  });
}
