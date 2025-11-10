// app/api/public/supabase-ping/route.ts
import { sbAdmin } from '@/lib/server/supabaseAdmin';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function GET() {
  const { data, error } = await sbAdmin.from('v_organizations').select('id,slug,name').order('slug');
  if (error) return Response.json({ ok:false, error: error.message }, { status: 500 });
  return Response.json({ ok:true, count: data.length, slugs: data.map(x=>x.slug), rows: data });
}
