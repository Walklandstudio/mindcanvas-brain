// app/test/[slug]/page.tsx
export default function TestPage({ params }: { params: { slug: string } }) {
  return (
    <div style={{ padding: 24 }}>
      <h1>Test route works</h1>
      <p>Slug: {params.slug}</p>
    </div>
  );
}

