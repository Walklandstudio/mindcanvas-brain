// apps/web/app/tests/[id]/teams/[team]/page.tsx
export const dynamic = 'force-dynamic';

type RouteParams = { id: string; team: string };

export default async function TeamPage({
  params,
}: {
  // Next 15: params is a Promise in server components
  params: Promise<RouteParams>;
}) {
  const { id, team } = await params;

  // TODO: fetch team/test data here if needed
  return (
    <div className="container-page">
      <h1 className="h1">Team: {team}</h1>
      <p className="muted">Test ID: {id}</p>
      <div className="card p-4 mt-4">
        <p>Coming soon: team analytics & roster for this test.</p>
      </div>
    </div>
  );
}
