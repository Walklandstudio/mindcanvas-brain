export const dynamic = 'force-dynamic';

type RouteParams = { token: string };

export default async function PublicReportPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { token } = await params;

  const printCSS = `
    @media print {
      html, body { background: white; }
      main { box-shadow: none !important; }
      .no-print { display: none !important; }
      .page { break-inside: avoid; page-break-inside: avoid; }
      .page-break { page-break-after: always; }
      @page {
        size: A4;
        margin: 12mm;
      }
    }
  `;

  return (
    <main className="container-page">
      {/* Print styles (no styled-jsx props) */}
      <style dangerouslySetInnerHTML={{ __html: printCSS }} />

      <header className="flex items-center justify-between mb-6 no-print">
        <h1 className="h1">Profile Report</h1>
        <div className="text-sm text-slate-500">Token: {token}</div>
      </header>

      <section className="card p-6 page">
        <h2 className="h2 mb-2">Summary</h2>
        <p className="text-slate-700">
          This is a placeholder report view for token <strong>{token}</strong>.
          We’ll render the frequency/profile result and branded sections here.
        </p>
      </section>

      <section className="card p-6 mt-6 page">
        <h3 className="h3 mb-2">Highlights</h3>
        <ul className="list-disc pl-6 text-slate-700">
          <li>Primary Frequency: TBD</li>
          <li>Profile: TBD</li>
          <li>Key Strengths: TBD</li>
        </ul>
      </section>

      <div className="no-print mt-8">
        <button
          className="btn"
          onClick={() => {
            if (typeof window !== 'undefined') window.print();
          }}
        >
          Print / Save as PDF
        </button>
      </div>
    </main>
  );
}
