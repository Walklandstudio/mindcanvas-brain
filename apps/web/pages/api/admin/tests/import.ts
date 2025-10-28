import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin'; // ✅ must exist (the service-role Supabase client)

// Type definition for the import payload
type ImportPayload = {
  orgSlug: string;
  test: {
    name: string;
    slug: string;
    status?: string;
    mode?: string;
  };
  frequencies?: { code: 'A' | 'B' | 'C' | 'D'; label: string }[];
  profiles: {
    code: string;
    name: string;
    frequency: 'A' | 'B' | 'C' | 'D';
    description?: string;
  }[];
  questions: Array<{
    idx?: number;
    order?: number;
    type?: string;
    text: string;
    options?: string[];
    category?: string; // 'scored' | 'qual'
    profile_map?: Array<{ profile: string; points: number }>;
  }>;
  thresholds?: Record<string, any>; // optional meta thresholds
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

  try {
    // 1️⃣ Ensure organization exists
    const org = await sbAdmin
      .from('organizations')
      .select('id')
      .eq('slug', body.orgSlug)
      .maybeSingle();

    if (org.error) throw org.error;
    if (!org.data) throw new Error(`Organization not found: ${body.orgSlug}`);

    // 2️⃣ Upsert the test (attach meta thresholds)
    const testUp = await sbAdmin
      .from('tests')
      .upsert(
        {
          org_id: org.data.id,
          name: body.test.name,
          slug: body.test.slug,
          status: body.test.status ?? 'active',
          mode: body.test.mode ?? 'full',
          meta: { thresholds: body.thresholds ?? null },
        },
        { onConflict: 'org_id,slug' }
      )
      .select('id')
      .maybeSingle();

    if (testUp.error) throw testUp.error;
    const testId = testUp.data?.id as string;
    if (!testId) throw new Error('Failed to upsert test');

    // 3️⃣ Frequencies (optional)
    if (Array.isArray(body.frequencies) && body.frequencies.length) {
      await sbAdmin.from('test_frequencies').delete().eq('test_id', testId);
      const insF = await sbAdmin.from('test_frequencies').insert(
        body.frequencies.map((f) => ({
          test_id: testId,
          code: f.code,
          label: f.label,
        }))
      );
      if (insF.error) throw insF.error;
    }

    // 4️⃣ Profiles (required)
    if (!Array.isArray(body.profiles) || !body.profiles.length) {
      throw new Error('profiles_required');
    }

    await sbAdmin.from('test_profiles').delete().eq('test_id', testId);
    const insP = await sbAdmin.from('test_profiles').insert(
      body.profiles.map((p) => ({
        test_id: testId,
        code: p.code,
        name: p.name,
        frequency: p.frequency,
        description: p.description ?? null,
      }))
    );
    if (insP.error) throw insP.error;

    // 5️⃣ Questions (required)
    if (!Array.isArray(body.questions) || !body.questions.length) {
      throw new Error('questions_required');
    }

    await sbAdmin.from('test_questions').delete().eq('test_id', testId);
    const qRows = body.questions.map((q, idx) => ({
      test_id: testId,
      idx: q.idx ?? idx + 1,
      order: q.order ?? idx + 1,
      type: q.type ?? 'radio',
      text: q.text,
      options: q.options ?? null,
      category: q.category ?? 'scored',
      profile_map: q.profile_map ?? null,
    }));
    const insQ = await sbAdmin.from('test_questions').insert(qRows);
    if (insQ.error) throw insQ.error;

    return res.status(200).json({
      ok: true,
      test_id: testId,
      counts: {
        profiles: body.profiles.length,
        questions: body.questions.length,
        frequencies: body.frequencies?.length ?? 0,
      },
    });
  } catch (e: any) {
    console.error('❌ Import error:', e);
    return res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
}
