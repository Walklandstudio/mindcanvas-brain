export default function PortalHome() {
  const clientName = "Client Name"; // TODO: fetch from org/session
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Client Portal — {clientName}
      </h1>
      <p className="text-slate-600">
        Use the sidebar to view your test taker database, create test links, and manage tests.
      </p>
    </div>
  );
}
