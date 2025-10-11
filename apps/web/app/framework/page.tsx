import { createClient as createServerClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = { id: string; name: string; frequency:'A'|'B'|'C'|'D'; ordinal: number };

async function loadProfiles(): Promise<Row[]> {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const role = process.env.SUPABASE_SERVICE_ROLE!;
  const s = createServerClient(url, role, { auth:{ persistSession:false, autoRefreshToken:false }});

  // first org + its framework
  const { data: org } = await s.from('organizations').select('id').order('created_at').limit(1).single();
  if (!org) return [];

  const { data: fw } = await s.from('org_frameworks').select('id').eq('org_id', org.id).order('created_at').limit(1).single();
  if (!fw) return [];

  const { data } = await s
    .from('org_profiles')
    .select('id, name, frequency, ordinal')
    .eq('org_id', org.id).eq('framework_id', fw.id)
    .order('ordinal', { ascending: true });

  return data ?? [];
}

export default async function Page() {
  const profiles = await loadProfiles();

  return (
    <main className="max-w-5xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Framework — Profiles</h1>
      <p className="text-sm text-white/70 mt-1">Auto-generated from onboarding goals. You can edit later.</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map(p => (
          <div key={p.id} className="rounded-xl border border-white/10 p-4">
            <div className="text-xs uppercase text-white/60">#{p.ordinal} • {p.frequency}</div>
            <div className="text-lg font-medium mt-1">{p.name}</div>
          </div>
        ))}
        {!profiles.length && <div className="text-white/70">No profiles yet. Complete onboarding & goals.</div>}
      </div>
    </main>
  );
}
