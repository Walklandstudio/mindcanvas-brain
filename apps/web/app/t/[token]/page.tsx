// apps/web/app/t/[token]/page.tsx
import StartForm from './StartForm';

async function getMeta(token: string) {
  // Fetch on the server to avoid CORS/extension noise and handle non-OK safely
  const res = await fetch(`${process.env.APP_ORIGIN || ''}/api/public/test/${token}`, {
    // If APP_ORIGIN is empty locally, Next will still resolve correctly
    cache: 'no-store',
  });
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` };
  }
  const text = await res.text();
  return text ? JSON.parse(text) : { ok: false, error: 'Empty response' };
}

export default async function TakeTestPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const meta = await getMeta(token);

  if (!meta?.ok) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Invalid or unavailable link</h1>
        <p className="text-sm text-red-500">{meta?.error || 'Unknown error'}</p>
      </main>
    );
  }

  const name = meta?.test?.name || 'Assessment';

  return (
    <main className="p-8 mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">{name}</h1>
      <StartForm token={token} />
    </main>
  );
}
