import ClientEditor from './ClientEditor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData() {
  const r = await fetch('/api/admin/reports', { cache: 'no-store' });
  if (!r.ok) throw new Error('Failed to load reports');
  return r.json();
}

export default async function Page() {
  const { profiles, drafts } = await getData();

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Report Builder</h1>
        <p className="text-sm text-slate-300 mt-1">
          Edit section drafts per profile. Live preview reflects Branding tokens.
        </p>
      </header>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <ClientEditor profiles={profiles} drafts={drafts} />
      </div>
    </main>
  );
}
