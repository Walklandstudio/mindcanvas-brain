import { sbAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ThresholdRow = {
  type: 'frequency' | 'profile';
  label: string;               // e.g., 'A'..'D' or '1'..'8'
  greater_than: number | null; // inclusive upper bound start
  less_than: number | null;    // exclusive upper bound end
};

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) return json(200, { ok: false, stage: 'init', error: 'missing_token' });

  try {
    const db = sbAdmin.schema('portal');

    // 1) token -> test
    const link = await db.from('test_links')
      .select('test_id')
      .eq('token', token)
      .maybeSingle();
    if (link.error) return json(200, { ok: false, stage: 'link_lookup', error: link.error.message });
    if (!link.data)  return json(200, { ok: false, stage: 'link_lookup', error: 'link_not_found' });

    const testId = link.data.test_id;

    // 2) profiles (name, code, frequency)
    const profiles = await db.from('profiles')
      .select('id, name, code, frequency')
      .eq('test_id', testId)
      .order('name', { ascending: true });
    if (profiles.error) return json(200, { ok: false, stage: 'profiles', error: profiles.error.message });

    // 3) thresholds for this test
    const th = await db.from('test_thresholds')
      .select('type, label, greater_than, less_than')
      .eq('test_id', testId)
      .order('type', { ascending: true })
      .order('greater_than', { ascending: false });
    if (th.error) return json(200, { ok: false, stage: 'thresholds', error: th.error.message });

    return json(200, {
      ok: true,
      test_id: testId,
      profiles: (profiles.data ?? []).map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        frequency: p.frequency as 'A' | 'B' | 'C' | 'D' | null,
      })),
      thresholds: (th.data ?? []) as ThresholdRow[],
    });
  } catch (e: any) {
    return json(200, { ok: false, stage: 'catch', error: e?.message || 'internal_error' });
  }
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
