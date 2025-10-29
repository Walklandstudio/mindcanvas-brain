// apps/web/app/t/[token]/result/page.tsx
import ResultView from "./ResultView";

type PageProps = {
  params: { token: string };
  searchParams?: { tid?: string };
};

function baseUrl() {
  // Don’t use headers() here; keep it simple and serializable.
  // Use envs so this works on Vercel and locally.
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: PageProps) {
  const token = params.token;
  const tid = (searchParams?.tid ?? "").toString();

  const url = `${baseUrl()}/api/public/test/${encodeURIComponent(
    token
  )}/report${tid ? `?tid=${encodeURIComponent(tid)}` : ""}`;

  // Server-side fetch, returns plain JSON.
  const res = await fetch(url, { cache: "no-store" });
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = { ok: false, error: "Invalid JSON from report API." };
  }

  if (!res.ok || !payload?.ok) {
    const msg =
      payload?.error ||
      `Could not load your result (HTTP ${res.status}). Please try again.`;
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">Result unavailable</h1>
        <p className="text-red-600">{msg}</p>
      </div>
    );
  }

  // Pass ONLY serializable JSON to the client component.
  return (
    <div className="max-w-3xl mx-auto p-6">
      <ResultView data={payload.data} />
    </div>
  );
}
