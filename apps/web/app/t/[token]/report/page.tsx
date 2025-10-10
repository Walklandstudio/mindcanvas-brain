// …existing imports…
type DraftSections = {
  strengths?: string; challenges?: string; roles?: string; guidance?: string; visibility?: string;
};

async function getBranding() {
  const r = await fetch('/api/onboarding', { cache: 'no-store' });
  const j = await r.json();
  return j.onboarding?.branding ?? {};
}

async function getDraftSections(profileId: string): Promise<DraftSections> {
  const r = await fetch(`/api/admin/reports?profileId=${profileId}`, { cache: 'no-store' });
  if (!r.ok) return {};
  const j = await r.json();
  // route below returns either all drafts or a single profile draft when profileId query exists
  return j.sections ?? (j.drafts?.[profileId] ?? {});
}

export default async function Page({ params }: { params: { token: string } }) {
  // …your existing scoring & profile resolution…
  const profileId = /* your existing resolved profile id */ '';

  const [branding, sections] = await Promise.all([
    getBranding(),
    getDraftSections(profileId),
  ]);

  const F = (x?: string, fallback?: string) => (x && x.trim().length ? x : fallback);

  return (
    <main
      className="mx-auto w-[850px] p-8 print:p-0"
      style={{
        ['--brand-primary' as any]: branding.primary || '#2d8fc4',
        ['--brand-secondary' as any]: branding.secondary || '#015a8b',
        ['--brand-accent' as any]: branding.accent || '#64bae2',
        fontFamily: branding.font || undefined,
      }}
    >
      {/* …your heading & meta… */}

      <section className="mt-6 space-y-5">
        <Block title="Strengths"    text={F(sections.strengths,  'Creative ideation, fast synthesis, team energy.')} />
        <Block title="Challenges"   text={F(sections.challenges, 'May skip details; needs structure & follow-through.')} />
        <Block title="Ideal Roles"  text={F(sections.roles,      'Product Strategy, Creative Direction, Innovation Lead.')} />
        <Block title="Guidance"     text={F(sections.guidance,   'Pair with detail partners; translate ideas into milestones.')} />
        <Block title="Visibility Strategy" text={F(sections.visibility, 'Publish ideas, run short pilots, socialize wins.')} />
      </section>
    </main>
  );
}

function Block({ title, text }: { title: string; text?: string }) {
  if (!text) return null;
  return (
    <div className="rounded-xl border border-black/10 p-4 bg-white/60 break-inside-avoid">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--brand-accent)' }}>{title}</h3>
      <p className="mt-1 text-[15px] leading-6 text-slate-800">{text}</p>
    </div>
  );
}
