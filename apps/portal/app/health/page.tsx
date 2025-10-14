// apps/portal/app/health/page.tsx
export const dynamic = "force-static";

export default function HealthPage() {
  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-semibold mb-2">Health</h1>
      <p className="text-sm text-white/70">
        OK — {new Date().toISOString()}
      </p>
    </main>
  );
}
