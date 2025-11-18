// apps/web/lib/report/getOrgFramework.ts

/**
 * getOrgFramework
 * ----------------
 * Loads the per-organisation framework JSON so we can
 * attach descriptive text (frequencies, profiles, flows)
 * to each report without touching scoring logic.
 */

import competencyCoachRaw from "@/data/frameworks/competency-coach.json";
import teamPuzzleRaw from "@/data/frameworks/team-puzzle.json";

export type OrgFrameworkFrequency = {
  code: string;
  name?: string;
  summary?: string;
};

export type OrgFrameworkProfile = {
  code: string;
  slug?: string;
  name?: string;
  summary?: string;
};

export type OrgFramework = {
  key: string;
  name: string;
  frequencies?: OrgFrameworkFrequency[];
  profiles?: OrgFrameworkProfile[];
  // Some orgs (e.g. Competency Coach) use "flows" instead of profiles
  flows?: any[];
};

type FrameworkJson = { framework?: OrgFramework; [key: string]: any };

const teamPuzzle: OrgFramework =
  (teamPuzzleRaw as FrameworkJson).framework ?? (teamPuzzleRaw as any);

const competencyCoach: OrgFramework =
  (competencyCoachRaw as FrameworkJson).framework ?? (competencyCoachRaw as any);

/**
 * Returns the framework object for a given org slug.
 * No crossover: each slug maps to its own JSON file.
 */
export function getOrgFramework(slug?: string | null): OrgFramework | null {
  if (!slug) return null;

  const s = slug.toLowerCase();

  switch (s) {
    case "team-puzzle":
    case "team_puzzle":
      return teamPuzzle;

    case "competency-coach":
    case "competency_coach":
      return competencyCoach;

    default:
      return null;
  }
}
