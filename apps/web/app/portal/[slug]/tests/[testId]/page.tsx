// apps/web/app/portal/[slug]/tests/[testId]/page.tsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type LinkRow = { id: string; token: string; use_count: number; max_uses: number | null };

async function getLinks(testId: string) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/tests/${testId}/links`, { cache: 'no-store' });
  const j = await r.json();
  return (j.links ?? []) as LinkRow[];
}

export default async function Page({ params }: { params: { slug: string; testId: string } }) {
  // lightweight internal API for existing links
  const links = await getLinks(params.testId);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const sample = links[0]?.token ?? 'TOKEN';
  const publicUrl = `${base}/t/${sample}`;
  const embed = `<iframe src="${publicUrl}" width="100%" height="800" frameborder="0"></iframe>`;
  const codeSnippet = `fetch('${base}/api/public/test/${sample}/questions').then(r=>r.json())`;

  return (
    <div className="p-6 space-y-4 text-white">
      <h1 className="text-2xl font-semibold">Test Details</h1>

      <form action={`/api/tests/${params.testId}/create-link`} method="post">
        <button className="px-3 py-2 border rounded" type="submit">Create Link</button>
      </form>

      <div>
        <div className="font-medium mb-1">Links</div>
        <ul className="space-y-1">
          {links.map(l => (
            <li key={l.id}><code>/t/{l.token}</code> · uses {l.use_count}{l.max_uses ? `/${l.max_uses}` : ''}</li>
          ))}
        </ul>
      </div>

      <div>
        <div className="font-medium mb-1">Embed</div>
        <pre className="p-2 bg-white text-black rounded border whitespace-pre-wrap">{embed}</pre>
      </div>

      <div>
        <div className="font-medium mb-1">Code Snippet</div>
        <pre className="p-2 bg-white text-black rounded border whitespace-pre-wrap">{codeSnippet}</pre>
      </div>
    </div>
  );
}
