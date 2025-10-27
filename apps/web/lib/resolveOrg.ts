// apps/web/lib/resolveOrg.ts
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
  // Fully-qualify schema to avoid any default-schema surprises
  const { data, error } = await sbAdmin
    .from('portal.v_organizations')
    .select('id, slug, name, is_active, logo_url, primary_color, secondary_color')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    // Return null instead of throwing; caller can render a friendly message
    console.error('resolveOrgBySlug error:', error.message);
    return null;
  }
  if (!data || !data.is_active) return null;
  return data as OrgRow;
}
