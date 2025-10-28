export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getResult(token: string) {
  // Server-side relative fetch (Next resolves to same origin)
  const r = await fetch(`/api/public/test/${token}/result`, { cache: 'no-store' });
  const j = await r.json().catch(() => ({} as any));
  if (!r.ok || j?.ok === false) {
    throw new Error(j?.error || `HTTP ${r.status}`);
  }
  return j as { ok: true; taker: any; totals: Record<string, number> };
}

export default async function ResultPage({ params }: { params: { token: string } }) {
  let data: Awaited<ReturnType<typeof getResult>> | null = null;
  let errMsg: string | null = null;

  try {
    data = await getResult(params.token);
  } catch (e: any) {
    errMsg = String(e?.message || e);
  }

  if (!data) {
    return (
      <div className="mc-bg min-h-screen text-white p-6 space-y-4">
        <h1 className="text-3xl font-bold">Your Report</h1>
        <div className="text-white/80">Could not load result.</div>
        {errMsg && (
          <pre className="p-3 rounded bg-white text-black whitespace-pre-wrap border">{errMsg}</pre>
        )}
        <div className="text-white/70 text-sm">
          Debug:
          <ul className="list-disc ml-5 mt-2">
            <li>
              <a className="underline" href={`/api/public/test/${params.token}/result`} target="_blank">
                /api/public/test/{params.token}/result
              </a>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  const entries = Object.entries(data.totals || {}).sort((a, b) => (b[1] as number) - (a[1] as number));
  const top = entries[0]?.[0];

  return (
    <div className="mc-bg min-h-screen text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold">Your Report</h1>
      <div className="text-white/80">
        {data.taker?.first_name ? `Thanks, ${data.taker.first_name}. ` : ''}Here are your results.
      </div>

      {entries.length === 0 ? (
        <div className="text-white/70">No scores yet. Did you submit the test?</div>
      ) : (
        <>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-lg font-semibold">Top Profile</div>
            <div className="text-2xl mt-1">{top}</div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-lg font-semibold mb-3">Profile Breakdown</div>
            <ul className="space-y-2">
              {entries.map(([profile, pts]) => (
                <li key={profile} className="flex justify-between">
                  <span>{profile}</span>
                  <span className="font-mono">{pts as number}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
