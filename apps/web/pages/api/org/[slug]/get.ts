import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.slug || '').trim().toLowerCase();
  if (!slug) return res.status(400).json({ ok:false, error:'missing slug' });

  // sbAdmin default schema = 'portal' (as we set earlier), so use unqualified table name.
  // Try with is_active if the column exists; if not, fall back and assume active.
  const withActive = await sbAdmin
    .from('orgs')
    .select('id, slug, name, is_active')
    .eq('slug', slug)
    .maybeSingle();

  if (withActive.error && /is_active/.test(withActive.error.message)) {
    const fallback = await sbAdmin
      .from('orgs')
      .select('id, slug, name')
      .eq('slug', slug)
      .maybeSingle();

    if (fallback.error) return res.status(500).json({ ok:false, error: fallback.error.message });
    if (!fallback.data) return res.status(404).json({ ok:false, error:'org_not_found' });

    return res.status(200).json({ ok:true, org: { ...fallback.data, is_active: true, logo_url: null, primary_color: null, secondary_color: null } });
  }

  if (withActive.error) return res.status(500).json({ ok:false, error: withActive.error.message });
  if (!withActive.data) return res.status(404).json({ ok:false, error:'org_not_found' });
  if (withActive.data.is_active === false) return res.status(404).json({ ok:false, error:'org_inactive' });

  // Normalize optional branding fields (not required)
  return res.status(200).json({
    ok: true,
    org: {
      ...withActive.data,
      logo_url: null,
      primary_color: null,
      secondary_color: null,
    },
  });
}
