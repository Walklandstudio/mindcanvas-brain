export default function OrgHome({ params }: { params: { slug: string } }) {
  const { slug } = params;
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Client Portal — {slug.replace(/-/g, " ")}</h1>
      <div className="space-y-4">
        <a className="block rounded border bg-white px-4 py-3 hover:bg-gray-50" href={`/portal/${slug}/database`}>
          View Test Taker Database →
        </a>
        <a className="block rounded border bg-white px-4 py-3 hover:bg-gray-50" href={`/portal/${slug}/tests`}>
          Manage Tests →
        </a>
      </div>
    </div>
  );
}
