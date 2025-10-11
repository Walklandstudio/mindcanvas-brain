import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const runtime = 'nodejs';

export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 👇 avoid implicit any on `k`
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

  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // One-org-per-user: use the user id as org id
  const orgId = user.id;

  // Ensure row exists
  await supabase.from('org_onboarding').upsert(
    { org_id: orgId },
    { onConflict: 'org_id' }
  );

  const { data, error } = await supabase
    .from('org_onboarding')
    .select('create_account,company,branding,goals')
    .eq('org_id', orgId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orgId, ...data });
}
