// app/report/[id]/ReportHero.tsx
type Props = {
  firstName: string;
  testName: string;
  profileName: string;        // e.g., "The Thinker"
  flowDisplay: string;        // e.g., "Rhythmic - Observer Coaching Flow"
  icon?: string | null;       // flow icon emoji
  // colors from flow (fallbacks if org has no brand)
  color?: string | null;
  bgFrom?: string | null;
  bgTo?: string | null;
  // org branding
  orgName?: string | null;
  logoUrl?: string | null;
  brandPrimary?: string | null;
  brandSecondary?: string | null;
};

export default function ReportHero({
  firstName,
  testName,
  profileName,
  flowDisplay,
  icon,
  color,
  bgFrom,
  bgTo,
  orgName,
  logoUrl,
  brandPrimary,
  brandSecondary,
}: Props) {
  const gradient = `linear-gradient(135deg, ${bgFrom || "#f4f4f5"} 0%, ${bgTo || "#e5e7eb"} 100%)`;
  const titleColor = brandPrimary || color || "#111827";
  const badgeColor = color || brandSecondary || "#374151";

  return (
    <section
      className="rounded-2xl p-6 border"
      style={{ backgroundImage: gradient }}
    >
      <div className="flex items-start gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={orgName || "Brand"}
            className="h-12 w-12 rounded-lg object-contain bg-white/70 p-1"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-white/70 text-xl">
            {icon || "⭐"}
          </div>
        )}

        <div className="flex-1">
          <p className="text-sm text-gray-700">
            Hi <strong>{firstName}</strong>,
          </p>
          <h1
            className="text-2xl font-semibold leading-snug"
            style={{ color: titleColor }}
          >
            Your {testName} Profile Report
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: badgeColor }}>
              {flowDisplay}
            </span>
            <span className="text-sm">Profile: <strong>{profileName}</strong></span>
            {orgName && <span className="text-sm text-gray-700">• {orgName}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
