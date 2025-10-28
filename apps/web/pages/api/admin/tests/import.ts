import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin'; // service-role client

type ImportPayload = {
  orgSlug: string;
  test: { name: string; slug: string; status?: string; mode?: string };
  // Stored inside tests.meta (no separate tables needed)
  frequencies?: { code: 'A' | 'B' | 'C' | 'D'; label: string }[];
  profiles?: { code: string; name: string; frequency: 'A' | 'B' | 'C' | 'D'; description?: string }[];
  thresholds?: Record<string, any>;
  questions: Array<{
    idx?: number;
    order?: number;
    type?: string;
    text: string;
    options?: string[];
    category?: string; // 'scored' | 'qual'
    profile_map?: Array<{ profile: string; points: number }>;
  }>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = req.body as ImportPayload;

  if (!body?.orgSlug || !body?.test?.name || !body?.test?.slug) {
    return res.status(400).json({ ok: false, error: 'missing_org_or_test' });
  }
  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return res.status(400).json({ ok: false, error: 'questions_required' });
  }

  try {
    // Always work in the portal schema
    const db = sbAdmin.schema('portal');

    // 1) Ensure org exists in portal.orgs
    const org = await db.from('orgs').select('id').eq('slug', body.orgSlug).maybeSingle();
    if (org.error) throw org.error;
    if (!org.data) throw new Error(`org_not_found:${body.orgSlug}`);

    // 2) Build meta blob for tests.meta
    const meta: Record<string, any> = {};
    if (body.thresholds) meta.thresholds = body.thresholds;
    if (body.frequencies) meta.frequencies = body.frequencies;
    if (body.profiles) meta.profiles = body.profiles;

    // 3) Upsert the test in portal.tests (requires portal.tests.meta jsonb column pre-created)
    const testUp = await db
      .from('tests')
      .upsert(
        {
          org_id: org.data.id,
          name: body.test.name,
          slug: body.test.slug,
          status: body.test.status ?? 'active',
          mode: body.test.mode ?? 'full',
          meta: Object.keys(meta).length ? meta : null,
        },
        { onConflict: 'org_id,slug' }
      )
      .select('id')
      .maybeSingle();

    if (testUp.error) throw testUp.error;
    const testId = testUp.data?.id as string;
    if (!testId) throw new Error('failed_upsert_test');

    // 4) Replace questions for this test
    const delQ = await db.from('test_questions').delete().eq('test_id', testId);
    if (delQ.error) throw delQ.error;

    const rows = body.questions.map((q, i) => ({
      test_id: testId,
      idx: q.idx ?? i + 1,
      order: q.order ?? i + 1,
      type: q.type ?? 'radio',
      text: q.text,
      options: q.options ?? null,
      category: q.category ?? 'scored',
      profile_map: q.profile_map ?? null,
    }));

    const insQ = await db.from('test_questions').insert(rows);
    if (insQ.error) throw insQ.error;

    return res.status(200).json({
      ok: true,
      org: body.orgSlug,
      test_id: testId,
      counts: { questions: rows.length },
    });
  } catch (e: any) {
    console.error('❌ Import error:', e?.message || e);
    return res.status(500).json({ ok: false, error: e?.message || 'internal_error' });
  }
}
