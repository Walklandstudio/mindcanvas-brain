'use client';

import PersonalityRadar from '@/components/charts/PersonalityRadar';

type PersonalityMapSectionProps = {
  result: {
    frequency_a_pct: number;
    frequency_b_pct: number;
    frequency_c_pct: number;
    frequency_d_pct: number;
    profile_1_pct: number;
    profile_2_pct: number;
    profile_3_pct: number;
    profile_4_pct: number;
    profile_5_pct: number;
    profile_6_pct: number;
    profile_7_pct: number;
    profile_8_pct: number;
  };
};

export default function PersonalityMapSection({
  result,
}: PersonalityMapSectionProps) {
  const frequencies = {
    innovationA: result.frequency_a_pct ?? 0,
    influenceB: result.frequency_b_pct ?? 0,
    implementationC: result.frequency_c_pct ?? 0,
    insightD: result.frequency_d_pct ?? 0,
  };

  const profiles = {
    p1: result.profile_1_pct ?? 0,
    p2: result.profile_2_pct ?? 0,
    p3: result.profile_3_pct ?? 0,
    p4: result.profile_4_pct ?? 0,
    p5: result.profile_5_pct ?? 0,
    p6: result.profile_6_pct ?? 0,
    p7: result.profile_7_pct ?? 0,
    p8: result.profile_8_pct ?? 0,
  };

  return (
    <section className="mt-4">
      <PersonalityRadar frequencies={frequencies} profiles={profiles} />
    </section>
  );
}


