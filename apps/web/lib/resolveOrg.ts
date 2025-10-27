import { sbAdmin } from '@/lib/supabaseAdmin';

export type OrgRow = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

export async function resolveOrgBySlug(slug: string): Promise<OrgRow | null> {
  const s = (slug ?? '').trim().toLowerCase();

  // Try portal schema (preferred)
  const { data, error } = await sbAdmin
    .from('v_organizations')
    .select('id, slug, name, is_active, logo_url, primary_color, secondary_color')
    .eq('slug', s)
    .maybeSingle();

  if (error) {
    // Fallback to public proxy view if portal has issues
    const f = await sbAdmin
      .from('v_organizations')
      .select('id, slug, name, is_active, logo_url, primary_color, secondary_color')
      .eq('slug', s)
      .maybeSingle();

    if (f.error) {
      console.error('resolveOrgBySlug error:', error.message, 'fallback:', f.error.message, 'slug:', s);
      return null;
    }
    if (!f.data || !f.data.is_active) return null;
    return f.data as OrgRow;
  }

  if (!data || !data.is_active) return null;
  return data as OrgRow;
}
