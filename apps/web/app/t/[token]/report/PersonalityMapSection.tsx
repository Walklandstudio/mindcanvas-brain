'use client';

import PersonalityRadar from '@/components/charts/PersonalityRadar';

export type PersonalityMapResult = {
  frequencies: {
    innovationA: number;
    influenceB: number;
    implementationC: number;
    insightD: number;
  };
  profiles: {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    p5: number;
    p6: number;
    p7: number;
    p8: number;
  };
};

export type PersonalityMapSectionProps = {
  result: PersonalityMapResult;
};

export default function PersonalityMapSection({
  result,
}: PersonalityMapSectionProps) {
  return (
    <div className="w-full">
      <PersonalityRadar
        frequencies={result.frequencies}
        profiles={result.profiles}
      />
    </div>
  );
}



