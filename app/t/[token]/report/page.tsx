export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({ params }: any) {
  const token: string = params?.token;

  return (
    <main className="mx-auto w-[850px] p-8">
      <h1 className="text-2xl font-semibold">Report</h1>
      <p className="text-sm text-slate-500 mt-1">Token: {token}</p>

      <div className="mt-6 rounded-xl border border-black/10 bg-white/70 p-4">
        <p className="text-sm text-slate-700">
          Render your report here. (Typing is relaxed to satisfy Next’s PageProps constraint.)
        </p>
      </div>
    </main>
  );
}
