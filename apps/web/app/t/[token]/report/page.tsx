// apps/web/app/t/[token]/report/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ❗ No PageProps imports. No generics. Inline the prop type.
export default async function Page(
  { params }: { params: { token: string } }
) {
  const { token } = params;

  // TODO: your existing scoring -> resolve profileId
  // const { profileId, profileName } = await getResultFromToken(token);

  // Branding + drafted sections (optional; keep if you already wired)
  // const branding = await fetch('/api/onboarding', { cache: 'no-store' }).then(r => r.json()).then(j => j.onboarding?.branding ?? {});
  // const sections = await fetch(`/api/admin/reports?profileId=${profileId}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(j => j.sections ?? {});

  return (
    <main className="mx-auto w-[850px] p-8">
      <h1 className="text-2xl font-semibold">Report</h1>
      <p className="text-sm text-slate-500 mt-1">Token: {token}</p>

      {/* Replace the stub below with your actual rendered sections */}
      <div className="mt-6 rounded-xl border border-black/10 bg-white/70 p-4">
        <p className="text-sm text-slate-700">
          Render your report here. (This stub exists to satisfy typing and unblock the build.)
        </p>
      </div>
    </main>
  );
}
