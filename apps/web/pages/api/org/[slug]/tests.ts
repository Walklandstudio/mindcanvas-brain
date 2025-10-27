// apps/web/pages/api/org/[slug]/tests.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.slug || '').trim().toLowerCase();
  if (!slug) return res.status(400).json({ ok:false, error:'missing slug' });

  const { data, error } = await sbAdmin
    .from('v_org_tests')
    .select('id,name,slug,status')
    .eq('org_slug', slug)
    .order('name');

  if (error) return res.status(500).json({ ok:false, error: error.message });
  res.status(200).json({ ok:true, tests: data ?? [] });
}
