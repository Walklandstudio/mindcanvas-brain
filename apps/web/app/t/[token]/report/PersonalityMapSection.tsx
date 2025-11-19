'use client';

// apps/web/app/t/[token]/report/PersonalityMapSection.tsx

import PersonalityRadar from '@/components/charts/PersonalityRadar';

type FrequencyCode = 'A' | 'B' | 'C' | 'D';

export type PersonalityMapSectionProps = {
  // decimals 0–1 coming from Supabase
  frequencyPercentages: Record<FrequencyCode, number>;
  // keyed by profile code, e.g. "P1"…"P8"
  profilePercentages: Record<string, number>;
};

export default function PersonalityMapSection({
  frequencyPercentages,
  profilePercentages,
}: PersonalityMapSectionProps) {
  // Convert decimals to 0–100 percentages for the chart
  const frequencies = {
    innovationA: (frequencyPercentages.A ?? 0) * 100,
    influenceB: (frequencyPercentages.B ?? 0) * 100,
    implementationC: (frequencyPercentages.C ?? 0) * 100,
    insightD: (frequencyPercentages.D ?? 0) * 100,
  };

  const profiles = {
    // If a code doesn’t exist for a given test, it will just be 0
    p1: (profilePercentages['P1'] ?? 0) * 100,
    p2: (profilePercentages['P2'] ?? 0) * 100,
    p3: (profilePercentages['P3'] ?? 0) * 100,
    p4: (profilePercentages['P4'] ?? 0) * 100,
    p5: (profilePercentages['P5'] ?? 0) * 100,
    p6: (profilePercentages['P6'] ?? 0) * 100,
    p7: (profilePercentages['P7'] ?? 0) * 100,
    p8: (profilePercentages['P8'] ?? 0) * 100,
  };

  return (
    <div className="w-full">
      <PersonalityRadar frequencies={frequencies} profiles={profiles} />
    </div>
  );
}



