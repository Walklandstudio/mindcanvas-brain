// server-only brand token loader
import 'server-only';
import { admin, getOwnerOrgAndFramework } from './org';

export async function getBrandTokens() {
  const { orgId } = await getOwnerOrgAndFramework();
  const svc = admin();

  const { data } = await svc
    .from('org_onboarding')
    .select('branding')
    .eq('org_id', orgId)
    .single();

  const b = (data?.branding ?? {}) as Record<string, any>;

  return {
    background: b.background || '#0b1220',     // NEW global bg
    primary:    b.primary    || '#2d8fc4',
    secondary:  b.secondary  || '#015a8b',
    accent:     b.accent     || '#64bae2',
    font:       b.font || 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial',
    logoUrl:    b.logoUrl || '',
    tone:       b.tone || '',
    description:b.description || '',
  };
}
