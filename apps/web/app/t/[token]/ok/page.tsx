export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { token: string } }) {
  return (
    <main className="mc-bg min-h-screen text-white p-6">
      <h1 className="text-2xl font-bold">OK — {params.token}</h1>
      <p className="mt-2 text-white/70">Dynamic route is wired.</p>
    </main>
  );
}
