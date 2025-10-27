// apps/web/pages/api/supabase-ping.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await sbAdmin
      .from('v_organizations')
      .select('id,slug,name')
      .order('slug');

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, count: data?.length ?? 0, slugs: data?.map(x => x.slug) ?? [] });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
