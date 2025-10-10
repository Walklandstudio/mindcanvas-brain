// apps/web/app/admin/framework/page.tsx
import FrameworkEditor from './ui/FrameworkEditor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Profile = { id: string; name: string; frequency: 'A'|'B'|'C'|'D'; ordinal: number };

async function getData(): Promise<{ profiles: Profile[] }> {
  const res = await fetch('/api/admin/framework', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load profiles');
  return res.json();
}

export default async function FrameworkPage() {
  const { profiles } = await getData();

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Framework — Profiles (8)</h1>
        <p className="text-sm text-slate-300 mt-1">
          Edit names, assign A–D, and set ordering (1–8). These map results → profile.
        </p>
      </header>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <FrameworkEditor initialProfiles={profiles} />
      </div>
    </main>
  );
}
