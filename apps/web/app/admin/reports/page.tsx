import NextDynamic from 'next/dynamic';

const ClientEditor = NextDynamic(() => import('./ClientEditor'), { ssr: false });

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ReportsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Report Builder</h1>
        <p className="text-sm text-white/70">
          Draft and edit profile report sections. Use AI to create first drafts.
        </p>
      </div>

      <div className="mc-card">
        <ClientEditor />
      </div>
    </div>
  );
}
