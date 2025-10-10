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
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Compatibility Matrix</h1>
      <p className="text-sm text-gray-500 mt-1">
        Set pair scores (0–100). Symmetry is applied automatically.
      </p>
      <CompatibilityEditor profiles={profiles} initialPairs={pairs} />
    </main>
  );
}
