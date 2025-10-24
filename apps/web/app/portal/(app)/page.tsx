export default function PortalHome() {
  // TODO: fetch org/client name from session/org table
  const clientName = "Client Name";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome, {clientName}</h1>
      <p className="text-gray-600">
        Use the sidebar to view your test taker database, create links, and manage tests.
      </p>
    </div>
  );
}
