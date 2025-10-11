import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function FrameworkPage() {
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

  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr || !user) {
    return <div className="p-10 text-red-400">Unauthorized</div>;
  }

  const orgId = user.id;

  // Use org_id (NOT owner_id)
  let { data: fw } = await supabase
    .from('org_frameworks')
    .select('id, org_id, version')
    .eq('org_id', orgId)
    .limit(1)
    .maybeSingle();

  if (!fw) {
    const { data, error } = await supabase
      .from('org_frameworks')
      .insert({ org_id: orgId, version: 1 })
      .select('id, org_id, version')
      .single();
    if (error) return <div className="p-10 text-red-400">Create failed: {error.message}</div>;
    fw = data!;
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-semibold">Framework</h1>
      <p className="mt-2 text-white/70">
        Framework ID: {fw.id} · Version {fw.version}
      </p>
      <div className="mt-6 rounded-xl border border-white/10 p-6">
        <p className="text-white/80">Generator coming next…</p>
      </div>
    </main>
  );
}
