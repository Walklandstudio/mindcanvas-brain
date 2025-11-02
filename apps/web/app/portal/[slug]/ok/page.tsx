// app/portal/[slug]/ok/page.tsx
export default function Page({ params }: { params: { slug: string } }) {
  return <div>OK — {params.slug}</div>;
}
