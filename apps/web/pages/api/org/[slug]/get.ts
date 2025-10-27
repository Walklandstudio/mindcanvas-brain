import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.slug || '').trim().toLowerCase();
  if (!slug) return res.status(400).json({ ok:false, error:'missing slug' });

  // First try selecting with is_active (ideal shape)
  const tryWithIsActive = await sbAdmin
    .from('v_organizations')
    .select('id, slug, name, is_active, logo_url, primary_color, secondary_color')
    .eq('slug', slug)
    .maybeSingle();

  // If the column doesn't exist, fall back to a shape without it
  if (tryWithIsActive.error && /is_active/.test(tryWithIsActive.error.message)) {
    const fallback = await sbAdmin
      .from('v_organizations')
      .select('id, slug, name, logo_url, primary_color, secondary_color')
      .eq('slug', slug)
      .maybeSingle();

    if (fallback.error) return res.status(500).json({ ok:false, error: fallback.error.message });
    if (!fallback.data) return res.status(404).json({ ok:false, error:'org_not_found' });

    // assume active if column is absent
    return res.status(200).json({ ok:true, org: { ...fallback.data, is_active: true } });
  }

  if (tryWithIsActive.error) return res.status(500).json({ ok:false, error: tryWithIsActive.error.message });
  if (!tryWithIsActive.data) return res.status(404).json({ ok:false, error:'org_not_found' });
  if (tryWithIsActive.data.is_active === false) return res.status(404).json({ ok:false, error:'org_inactive' });

  return res.status(200).json({ ok:true, org: tryWithIsActive.data });
}
