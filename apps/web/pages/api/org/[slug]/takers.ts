import type { NextApiRequest, NextApiResponse } from 'next';
import { sbAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({ok:false,error:'method_not_allowed'}); }
  const slug = String(req.query.slug||'').trim();
  if (!slug) return res.status(400).json({ok:false,error:'missing slug'});

  const org = await sbAdmin.from('v_organizations').select('id').eq('slug', slug).maybeSingle();
  if (org.error) return res.status(500).json({ok:false,error:org.error.message});
  if (!org.data) return res.status(404).json({ok:false,error:'org_not_found'});

  const rows = await sbAdmin.from('test_takers')
    .select('id, email, first_name, last_name, status, created_at')
    .eq('org_id', org.data.id)
    .order('created_at', { ascending:false });
  if (rows.error) return res.status(500).json({ok:false,error:rows.error.message});

  return res.status(200).json({ ok:true, takers: rows.data });
}
