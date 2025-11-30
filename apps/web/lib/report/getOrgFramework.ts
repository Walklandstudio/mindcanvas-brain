// apps/web/lib/report/getOrgFramework.ts

// Import the org-specific framework JSON files.
// The "@/..." alias points at apps/web.
import teamPuzzle from '@/data/frameworks/team-puzzle.json';
import competencyCoach from '@/data/frameworks/competency-coach.json';

// A framework can currently be either Team Puzzle or Competency Coach.
// (If we add more later, we can expand this union.)
export type OrgFramework = typeof teamPuzzle | typeof competencyCoach;

// Map org slugs to their framework JSON
const FRAMEWORKS_BY_SLUG: Record<string, OrgFramework> = {
  // Team Puzzle variants
  'team-puzzle': teamPuzzle,
  'team_puzzle': teamPuzzle,
  'team puzzle': teamPuzzle,
  'life-puzzle': teamPuzzle,

  // Competency Coach variants
  'competency-coach': competencyCoach,
  'competency_coach': competencyCoach,
  'competency coach': competencyCoach,
};

// If we can’t match a slug, fall back to Team Puzzle copy.
// (Safer than trying to use a totally different JSON shape.)
const GENERIC_FALLBACK: OrgFramework = teamPuzzle;

/**
 * Look up the org-specific framework + report copy JSON
 * based on the organisation slug coming from Supabase.
 */
export function getOrgFramework(
  orgSlug: string | null | undefined
): OrgFramework {
  if (!orgSlug) return GENERIC_FALLBACK;

  const key = orgSlug.trim().toLowerCase();

  // Direct match
  if (FRAMEWORKS_BY_SLUG[key]) {
    return FRAMEWORKS_BY_SLUG[key];
  }

  // Normalise spaces/underscores → hyphens and try again
  const normalised = key.replace(/\s+/g, '-').replace(/_/g, '-');
  if (FRAMEWORKS_BY_SLUG[normalised]) {
    return FRAMEWORKS_BY_SLUG[normalised];
  }

  // Last resort – generic fallback
  return GENERIC_FALLBACK;
}

