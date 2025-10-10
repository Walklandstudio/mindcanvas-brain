// apps/web/app/page.tsx
export default function Landing() {
  return (
    <main className="max-w-5xl mx-auto p-10">
      <h1 className="text-3xl font-bold">MindCanvas — Signature Profiling System</h1>
      <p className="text-gray-600 mt-2">
        Create, brand, deploy, and analyze TEMA-based profile tests.
      </p>
      <div className="mt-6 flex gap-3">
        <a className="px-4 py-2 rounded-xl bg-black text-white" href="/onboarding/(wizard)/create-account">
          Start Here
        </a>
        <a className="px-4 py-2 rounded-xl border" href="/dashboard">
          Go to Dashboard
        </a>
      </div>
    </main>
  );
}
