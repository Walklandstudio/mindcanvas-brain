import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.slug || '').trim().toLowerCase();
  if (!slug) return res.status(400).json({ ok:false, error:'missing slug' });

  // sbAdmin is set to db: { schema: 'portal' }, so use unqualified names
  const { data, error } = await sbAdmin
    .from('v_organizations')
    .select('id, slug, name, is_active, logo_url, primary_color, secondary_color')
    .eq('slug', slug)
    .maybeSingle();

  if (error) return res.status(500).json({ ok:false, error: error.message });
  if (!data || !data.is_active) return res.status(404).json({ ok:false, error:'org_not_found' });
  res.status(200).json({ ok:true, org: data });
}
