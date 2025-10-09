import { NextResponse } from 'next/server';
import { admin, orgIdFromAuth } from '../../_lib/org';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    // Try auth, but also allow unauthenticated listing for public tests if you prefer
    const auth = req.headers.get('authorization') ?? '';
    const a = admin();

    // If you want org scoping strictly by auth, uncomment these two lines:
    // if (!auth.startsWith('Bearer ')) return NextResponse.json({ items: [] });
    // const orgId = await orgIdFromAuth(auth); if (!orgId) return NextResponse.json({ items: [] });

    // For now: return the base 15 from any org that has them (or your default org).
    const { data, error } = await a
      .from('org_questions')
      .select('id,label,options,display_order')
      .order('display_order', { ascending: true })
      .limit(15);

    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (e:any) {
    return NextResponse.json({ items: [], error: String(e?.message ?? e) }, { status:200 });
  }
}
