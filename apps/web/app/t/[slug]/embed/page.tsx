export const dynamic = "force-dynamic";

// Keep this page as-is; just change how we read params to satisfy Next 15 typing.
export default async function Page(props: any) {
  // In Next 15, params can be a Promise during prerender.
  const { slug } = (await props?.params) ?? {};

  // 🔽 keep your existing UI below, just use `slug`
  // Example:
  // return <EmbedRunner slug={slug} />
  return (
    <iframe
      src={`/t/${slug}`}
      style={{ width: "100%", height: "100vh", border: 0 }}
      allowFullScreen
    />
  );
}
