// apps/web/lib/report/buildCoachSummary.ts

export type CoachSummary = {
  headline: string;
  bullets: string[];
};

/**
 * Build a simple coach summary from the org framework JSON
 * and the test-taker's top profile.
 *
 * orgFramework is your per-org JSON (team-puzzle.json / competency-coach.json)
 * that already includes:
 *  report.profiles.PROFILE_X.{ one_liner, traits[], motivators[], blind_spots[], example }
 */
export function buildCoachSummary(
  orgFramework: any,
  opts: { topProfileCode?: string | null; topProfileName?: string | null }
): CoachSummary | null {
  const code = opts.topProfileCode ?? '';
  const nameFallback = opts.topProfileName ?? 'Top profile';

  const profiles = orgFramework?.report?.profiles;
  if (!profiles || !code || !profiles[code]) {
    return null;
  }

  const prof = profiles[code];

  const bullets: string[] = [];

  if (Array.isArray(prof.traits) && prof.traits[0]) {
    bullets.push(String(prof.traits[0]));
  }
  if (Array.isArray(prof.motivators) && prof.motivators[0]) {
    bullets.push(String(prof.motivators[0]));
  }
  if (Array.isArray(prof.blind_spots) && prof.blind_spots[0]) {
    bullets.push(String(prof.blind_spots[0]));
  }
  if (typeof prof.example === 'string' && prof.example.trim()) {
    bullets.push(prof.example.trim());
  }

  return {
    headline: String(prof.one_liner || nameFallback),
    bullets,
  };
}
