import { sbAdmin } from '@/lib/supabaseAdmin';

export type OrgRow = {
  id: string; slug: string; name: string; is_active: boolean;
  logo_url: string | null; primary_color: string | null; secondary_color: string | null;
};

export async function resolveOrgBySlug(slug: string): Promise<OrgRow | null> {
  const s = (slug ?? '').trim().toLowerCase();

  // sbAdmin is set to db: { schema: 'portal' }, so use unqualified names
  const { data, error } = await sbAdmin
    .from('v_organizations')
    .select('id, slug, name, is_active, logo_url, primary_color, secondary_color')
    .eq('slug', s)
    .maybeSingle();

  if (error) {
    console.error('resolveOrgBySlug:', error.message, 'slug:', s);
    return null;
  }
  return data && data.is_active ? (data as OrgRow) : null;
}
