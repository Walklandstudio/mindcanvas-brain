export type ReportData = {
  org: { name: string; brand_name?: string|null; logo_url?: string|null; report_cover_tagline?: string|null; };
  taker: { first_name?: string|null; last_name?: string|null; email?: string|null; role?: string|null; };
  results: { frequencies: Record<'A'|'B'|'C'|'D', number>; topProfile: { code: number; name: string; desc?: string } };
  copy?: { intro?: string; disclaimer?: string|null };
};

export default function ReportShell({ data }: { data: ReportData }) {
  return (
    <div className="space-y-8 report-font">
      <section>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--brand-primary)' }}>
          {(data.org.brand_name ?? data.org.name)} — Signature Profiling Report
        </h1>
        {data.org.logo_url && <img src={data.org.logo_url} alt="" className="mt-3 h-10" />}
        {data.org.report_cover_tagline && <p className="opacity-70 mt-2">{data.org.report_cover_tagline}</p>}
        <div className="mt-4 text-sm">
          <div><b>Participant:</b> {data.taker.first_name} {data.taker.last_name}</div>
          {data.taker.role && <div><b>Role:</b> {data.taker.role}</div>}
          <div><b>Date:</b> {new Date().toLocaleDateString()}</div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium mb-2">How to read this report</h2>
        <p className="opacity-80">{data.copy?.intro ?? 'This report introduces Frequencies (A–D) and Profiles (1–8) and how to interpret your results.'}</p>
      </section>

      <section>
        <h2 className="text-xl font-medium mb-2">Frequency Summary</h2>
        <div className="grid grid-cols-4 gap-3">
          {(['A','B','C','D'] as const).map(k => (
            <div key={k} className="rounded-lg border p-3">
              <div className="text-sm opacity-70">Frequency {k}</div>
              <div className="text-2xl font-semibold">{Math.round((data.results.frequencies[k] ?? 0))}%</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium mb-1">Top Profile</h2>
        <div className="rounded-lg border p-3">
          <div className="text-lg font-semibold" style={{ color: 'var(--brand-secondary)' }}>
            {data.results.topProfile.name}
          </div>
          {data.results.topProfile.desc && <p className="mt-1 opacity-80">{data.results.topProfile.desc}</p>}
        </div>
      </section>

      <footer className="pt-4 border-t text-xs opacity-70">
        © {new Date().getFullYear()} MindCanvas · Report v1
      </footer>
    </div>
  );
}
