// apps/web/lib/report/getOrgFramework.ts

// Import the org-specific framework JSON files.
// The "@/..." alias points at apps/web.
import teamPuzzle from "@/data/frameworks/team-puzzle.json";
import competencyCoach from "@/data/frameworks/competency-coach.json";

// A framework can currently be either Team Puzzle or Competency Coach.
// (If we add more later, we can expand this union.)
export type OrgFramework = typeof teamPuzzle | typeof competencyCoach;

// --- Helpers ---------------------------------------------------------------

// Normalise slugs / names so we can safely match different variants.
function normalise(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

// Map org slugs to their framework JSON using *normalised* keys.
const FRAMEWORKS_BY_SLUG: Record<string, OrgFramework> = {
  // Team Puzzle variants
  "team-puzzle": teamPuzzle,
  "life-puzzle": teamPuzzle,

  // Competency Coach variants
  "competency-coach": competencyCoach,
};

// If we can’t match a slug, fall back to Team Puzzle copy.
// (Safer than trying to use a totally different JSON shape.)
const GENERIC_FALLBACK: OrgFramework = teamPuzzle;

/**
 * Look up the org-specific framework + report copy JSON
 * based on the organisation slug coming from Supabase.
 *
 * This is resilient to variants like:
 *  - "team puzzle", "team_puzzle", "team-puzzle-2025"
 *  - "Competency Coach", "competency_coach", "competency-coach-dna"
 */
export function getOrgFramework(
  orgSlug: string | null | undefined
): OrgFramework {
  if (!orgSlug) return GENERIC_FALLBACK;

  const raw = orgSlug.trim();
  const key = normalise(raw);

  // 1) Exact normalised match (preferred)
  if (FRAMEWORKS_BY_SLUG[key]) {
    return FRAMEWORKS_BY_SLUG[key];
  }

  // 2) Heuristic match by substring – safe for scaling to more brands later
  if (key.includes("team") && key.includes("puzzle")) {
    return teamPuzzle;
  }

  if (key.includes("competency") && key.includes("coach")) {
    return competencyCoach;
  }

  // 3) Last resort – generic fallback (Team Puzzle)
  return GENERIC_FALLBACK;
}
