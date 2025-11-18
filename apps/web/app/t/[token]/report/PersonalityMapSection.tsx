'use client';

import PersonalityRadar from '@/components/charts/PersonalityRadar';

type PersonalityMapSectionProps = {
  // This matches how page.tsx is calling it
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

export default function PersonalityMapSection({ result }: PersonalityMapSectionProps) {
  const frequencies = {
    innovationA: result.frequency_a_pct ?? 0, // A
    influenceB: result.frequency_b_pct ?? 0,  // B
    implementationC: result.frequency_c_pct ?? 0, // C
    insightD: result.frequency_d_pct ?? 0,    // D
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
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 md:p-7">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">
        Your Personality Map
      </h2>
      <p className="mb-4 text-sm text-slate-700">
        This visual map shows how your overall energy (Frequencies) and your more
        detailed style (Profiles) are distributed across the model. Higher values
        show patterns you use more often.
      </p>
      <div className="w-full">
        <PersonalityRadar frequencies={frequencies} profiles={profiles} />
      </div>
    </section>
  );
}
