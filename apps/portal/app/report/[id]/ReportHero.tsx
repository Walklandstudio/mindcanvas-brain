// app/report/[id]/ReportHero.tsx
import Image from 'next/image';
import { PROFILE_IMAGES, PROFILE_TITLES, ProfileKey } from '@/lib/profileImages';

export type ReportHeroProps = {
  firstName?: string | null;
  profileCode?: ProfileKey | null;  // P1..P8
  // Optional preloaded content
  welcomeLong?: string | null;
  introductionLong?: string | null;
};

export default function ReportHero({ firstName, profileCode, welcomeLong, introductionLong }: ReportHeroProps) {
  const titleName = profileCode ? PROFILE_TITLES[profileCode] : null;
  const imgSrc = profileCode ? PROFILE_IMAGES[profileCode] : null;

  return (
    <header className="rounded-2xl border p-6 md:p-8 bg-gradient-to-b from-slate-50 to-white">
      <div className="flex items-center gap-4">
        {imgSrc ? (
          <Image src={imgSrc} alt={titleName ?? 'Profile'} width={72} height={72} className="rounded-xl border" />
        ) : (
          <div className="w-16 h-16 rounded-xl border grid place-items-center text-xl">✨</div>
        )}
        <div>
          <p className="text-slate-700">
            Hi {firstName ?? 'there'},
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold">
            Your Competency Coach Profile Report
          </h1>
          {titleName && (
            <p className="text-slate-600 mt-1">
              Profile: <span className="font-medium">{titleName}</span>
            </p>
          )}
        </div>
      </div>

      {(welcomeLong || introductionLong) && (
        <div className="mt-6 prose max-w-none">
          {welcomeLong && <p>{welcomeLong}</p>}
          {introductionLong && <p>{introductionLong}</p>}
        </div>
      )}
    </header>
  );
}
