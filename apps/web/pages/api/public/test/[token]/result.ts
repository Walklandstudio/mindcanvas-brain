// apps/web/pages/api/public/test/[token]/result.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

type Totals = Record<string, number>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.query.token as string | undefined;

  // ✅ Always return 200 with a payload (no 401s from this route)
  if (!token) {
    return res.status(200).json({
      ok: false,
      stage: 'init',
      error: 'missing_token',
    });
  }

  // Quick env canary (helps catch wrong project / missing key)
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasRole = !!process.env.SUPABASE_SERVICE_ROLE;

  try {
    // Use fully-qualified table names to bypass schema-switch quirks
    // This avoids `.schema('portal')` restrictions seen earlier.
    const link = await sbAdmin
      .from('portal.test_links')
      .select('test_id, token')
      .eq('token', token)
      .maybeSingle();

    if (link.error) {
      return res.status(200).json({
        ok: false,
        stage: 'link_lookup',
        env: { hasUrl, hasRole },
        error: link.error.message,
        hint: 'Ensure portal.test_links exists and service-role key is valid for this Supabase project.',
      });
    }
    if (!link.data) {
      return res.status(200).json({
        ok: false,
        stage: 'link_lookup',
        env: { hasUrl, hasRole },
        error: 'link_not_found',
      });
    }

    const taker = await sbAdmin
      .from('portal.test_takers')
      .select('id, first_name, last_name, email, status')
      .eq('link_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (taker.error) {
      return res.status(200).json({
        ok: false,
        stage: 'taker_lookup',
        env: { hasUrl, hasRole },
        error: taker.error.message,
        hint: 'Check portal.test_takers permissions / existence.',
      });
    }
    if (!taker.data) {
      return res.status(200).json({
        ok: false,
        stage: 'taker_lookup',
        env: { hasUrl, hasRole },
        error: 'taker_not_found',
        hint: 'Submit flow may not have created a taker yet for this token.',
      });
    }

    // Try to fetch precomputed totals (fail-soft if table missing)
    let totals: Totals = {};
    const sub = await sbAdmin
      .from('portal.test_submissions')
      .select('totals')
      .eq('taker_id', taker.data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub.error) {
      // If the table doesn’t exist yet or RLS blocks, don’t fail the endpoint
      totals = {};
    } else if (sub.data?.totals) {
      totals = sub.data.totals as Totals;
    }

    return res.status(200).json({
      ok: true,
      taker: taker.data,
      totals,
      meta: { env: { hasUrl, hasRole } },
    });
  } catch (e: any) {
    return res.status(200).json({
      ok: false,
      stage: 'catch',
      env: { hasUrl, hasRole },
      error: e?.message || 'internal_error',
    });
  }
}
