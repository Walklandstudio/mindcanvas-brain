export const dynamic = 'force-dynamic';

type RouteParams = { id: string };

export default async function TeamsIndexPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;

  return (
    <div className="container-page">
      <h1 className="h1">Teams for Test</h1>
      <p className="muted">Test ID: {id}</p>

      <div className="card p-4 mt-4">
        <p>List teams for this test here (e.g., /tests/{id}/teams/{'{teamName}'}).</p>
      </div>
    </div>
  );
}
