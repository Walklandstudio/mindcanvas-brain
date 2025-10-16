// optional but helpful to avoid caching issues while you iterate
export const dynamic = "force-dynamic";

type SlugParams = { slug: string };

// ⬇️ Change your default export to be async and accept Promise OR object
export default async function Page(
  { params }: { params: Promise<SlugParams> } | { params: SlugParams }
) {
  // ⬇️ NEW: resolve params whether Next provides a Promise or a plain object
  const maybePromise = params as any;
  const resolved: SlugParams = typeof maybePromise?.then === "function"
    ? await (params as Promise<SlugParams>)
    : (params as SlugParams);

  const { slug } = resolved;

  // ⬇️ keep the rest of your page exactly as it was, using `slug`
  // e.g. return <EmbedRunner slug={slug} />
}
