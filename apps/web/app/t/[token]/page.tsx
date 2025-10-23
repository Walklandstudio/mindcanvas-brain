// apps/web/app/t/[token]/page.tsx
import StartForm from './StartForm';

export const dynamic = 'force-dynamic';

async function getMeta(token: string) {
  const base = process.env.APP_ORIGIN || '';
  const res = await fetch(`${base}/api/public/test/${token}`, { cache: 'no-store' });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : { ok: false, error: 'Empty response' };
  } catch {
    return { ok: false, error: 'Invalid JSON from API' };
  }
}

// NOTE: In Next 15, params is a Promise
export default async function TakeTestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
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
