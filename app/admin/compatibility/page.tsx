import CompatibilityEditor from './ui/CompatibilityEditor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData() {
  const res = await fetch('/api/admin/compatibility', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load compatibility');
  return res.json();
}

export default async function Page() {
  const { profiles, pairs } = await getData();
  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Compatibility Matrix</h1>
        <p className="text-sm text-slate-300 mt-1">Set pair scores (0–100). Symmetry enforced.</p>
      </header>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <CompatibilityEditor profiles={profiles} initialPairs={pairs} />
      </div>
    </main>
  );
}
