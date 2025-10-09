import { admin } from '../../../api/_lib/org';

export const dynamic = 'force-dynamic';

async function getData(token: string) {
  const a = admin();
  const { data, error } = await a.from('test_results')
    .select('best_frequency,best_profile,totals,taker_name')
    .eq('token', token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export default async function ResultPage({ params }: { params: { token: string } }) {
  const data = await getData(params.token);

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Result not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Your Profile Result</h1>
      <p>Top Frequency: <strong>{data.best_frequency}</strong></p>
      <p>Top Profile: <strong>{data.best_profile}</strong></p>

      <section className="mt-6">
        <h2 className="font-semibold mb-2">Breakdown</h2>
        <pre className="bg-gray-50 p-3 rounded border border-gray-200 text-xs">
{JSON.stringify(data.totals, null, 2)}
        </pre>
      </section>

      <div className="print:hidden">
        <button onClick={() => window.print()} className="mt-4 px-4 py-2 bg-sky-700 text-white rounded-md">
          Print / Save as PDF
        </button>
      </div>
    </main>
  );
}
