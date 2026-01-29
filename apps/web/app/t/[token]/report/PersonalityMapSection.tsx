'use client';

// apps/web/app/t/[token]/report/PersonalityMapSection.tsx

import PersonalityRadar from '@/components/charts/PersonalityRadar';

type FrequencyCode = 'A' | 'B' | 'C' | 'D';

export type PersonalityMapSectionProps = {
  // decimals 0–1 coming from Supabase
  frequencyPercentages: Record<FrequencyCode, number>;
  // may be keyed by 'P1'…'P8' or 'PROFILE_1'… etc.
  profilePercentages: Record<string, number>;
};

export default function PersonalityMapSection({
  frequencyPercentages,
  profilePercentages,
}: PersonalityMapSectionProps) {
  // Convert frequency decimals to 0–100 percentages for the chart
  const frequencies = {
    A: (frequencyPercentages.A ?? 0) * 100,
    B: (frequencyPercentages.B ?? 0) * 100,
    C: (frequencyPercentages.C ?? 0) * 100,
    D: (frequencyPercentages.D ?? 0) * 100,
  };

  // Normalise profile keys:
  // support P1…P8, PROFILE_1…PROFILE_8, etc.
  const numericBuckets: Record<number, number> = {};

  for (const [key, value] of Object.entries(profilePercentages || {})) {
    const numMatch = key.match(/(\d+)/); // grab "3" from "PROFILE_3" or "P3"
    if (!numMatch) continue;
    const idx = Number(numMatch[1]);
    if (!Number.isFinite(idx)) continue;
    if (idx < 1 || idx > 8) continue;
    const existing = numericBuckets[idx] ?? 0;
    numericBuckets[idx] = existing + (Number(value) || 0);
  }

  const profiles = {
    p1: (numericBuckets[1] ?? 0) * 100,
    p2: (numericBuckets[2] ?? 0) * 100,
    p3: (numericBuckets[3] ?? 0) * 100,
    p4: (numericBuckets[4] ?? 0) * 100,
    p5: (numericBuckets[5] ?? 0) * 100,
    p6: (numericBuckets[6] ?? 0) * 100,
    p7: (numericBuckets[7] ?? 0) * 100,
    p8: (numericBuckets[8] ?? 0) * 100,
  };

  return (
    <div className="w-full">
      <PersonalityRadar frequencies={frequencies} profiles={profiles} />
    </div>
  );
}



