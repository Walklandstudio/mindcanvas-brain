import { Metadata } from 'next';
export const metadata: Metadata = { title: 'Your Result' };

export default async function ResultPage({ params }: { params: { token: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/public/test/${params.token}/result`, { cache:'no-store' });
  const j = await res.json();
  if (!res.ok || j?.ok === false) {
    return <div className="mc-bg min-h-screen text-white p-6">Failed to load result.</div>;
  }
  const totals = j.totals || {};
  const entries = Object.entries(totals as Record<string, number>).sort((a,b)=>b[1]-a[1]);
  const top = entries[0]?.[0];

  return (
    <div className="mc-bg min-h-screen text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold">Your Result</h1>
      <div className="text-white/80">Thank you{j.taker?.first_name ? `, ${j.taker.first_name}` : ''}!</div>

      {entries.length === 0 ? (
        <div className="text-white/70">No scores yet. Did you submit?</div>
      ) : (
        <>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-lg font-semibold">Top Profile</div>
            <div className="text-2xl mt-1">{top}</div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-lg font-semibold mb-3">Breakdown</div>
            <ul className="space-y-2">
              {entries.map(([profile, pts]) => (
                <li key={profile} className="flex justify-between">
                  <span>{profile}</span>
                  <span className="font-mono">{pts}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
