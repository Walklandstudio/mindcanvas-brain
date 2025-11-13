import teamPuzzleRaw from "@/data/frameworks/team_puzzle_framework.json";
import competencyCoachRaw from "@/data/frameworks/competency_coach_framework.json";

export type OrgFrameworkFrequency = {
  code: string;
  name: string;
  summary?: string;
};

export type OrgFrameworkProfile = {
  code: string;
  slug?: string;
  name: string;
  summary?: string;
};

export type OrgFramework = {
  key: string;
  name: string;
  frequencies?: OrgFrameworkFrequency[];
  profiles?: OrgFrameworkProfile[];
};

type FrameworkJson = { framework?: OrgFramework };

const teamPuzzle: OrgFramework =
  (teamPuzzleRaw as FrameworkJson).framework ?? (teamPuzzleRaw as any);

const competencyCoach: OrgFramework =
  (competencyCoachRaw as FrameworkJson).framework ?? (competencyCoachRaw as any);

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
