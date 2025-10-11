import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const runtime = 'nodejs';

type Section = 'create_account' | 'company' | 'branding' | 'goals';

export async function POST(req: Request) {
  const { section, payload } = await req.json() as {
    section: Section;
    payload: Record<string, unknown>;
  };

  if (!section) return NextResponse.json({ error: 'missing section' }, { status: 400 });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const orgId = user.id;

  // Guarantee row exists
  await supabase.from('org_onboarding').upsert(
    { org_id: orgId },
    { onConflict: 'org_id' }
  );

  const { error } = await supabase
    .from('org_onboarding')
    .update({ [section]: payload })
    .eq('org_id', orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
