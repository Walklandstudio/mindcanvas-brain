import FrameworkEditor from './_components/FrameworkEditor';

export const dynamic = 'force-dynamic';

export default function FrameworkPage() {
  return (
    <main className="container-page">
      <h1 className="section-title mb-4">Framework Generator</h1>
      <p className="text-sm text-slate-600 mb-6">
        Edit your organization’s Frequencies and Profiles. Save to apply.
      </p>
      <FrameworkEditor />
    </main>
  );
}
