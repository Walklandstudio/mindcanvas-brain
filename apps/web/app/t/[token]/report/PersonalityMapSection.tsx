// app/t/[token]/report/PersonalityMapSection.tsx
'use client';

import PersonalityRadar from '@/components/charts/PersonalityRadar';

export type PersonalityMapSectionProps = {
  frequencyPercentages: Record<'A' | 'B' | 'C' | 'D', number>;
  profilePercentages: Record<string, number>;
};

export default function PersonalityMapSection({
  frequencyPercentages,
  profilePercentages,
}: PersonalityMapSectionProps) {
  const frequencies = {
    innovationA: frequencyPercentages.A ?? 0,
    influenceB: frequencyPercentages.B ?? 0,
    implementationC: frequencyPercentages.C ?? 0,
    insightD: frequencyPercentages.D ?? 0,
  };

  // Assumes Team Puzzle / CC style profile codes P1–P8
  const profiles = {
    p1: profilePercentages['P1'] ?? 0,
    p2: profilePercentages['P2'] ?? 0,
    p3: profilePercentages['P3'] ?? 0,
    p4: profilePercentages['P4'] ?? 0,
    p5: profilePercentages['P5'] ?? 0,
    p6: profilePercentages['P6'] ?? 0,
    p7: profilePercentages['P7'] ?? 0,
    p8: profilePercentages['P8'] ?? 0,
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7">
      <h2 className="text-lg font-semibold text-slate-900">
        Your Personality Map
      </h2>
      <p className="mt-2 text-sm text-slate-700">
        This visual map shows how your overall energy (Frequencies) and your
        more detailed style (Profiles) are distributed across the model.
        Higher values show patterns you use more often.
      </p>
      <div className="mt-6">
        <PersonalityRadar frequencies={frequencies} profiles={profiles} />
      </div>
    </section>
  );
}

