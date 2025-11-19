// lib/report/getOrgFramework.ts

import teamPuzzleFramework from '@/data/frameworks/team-puzzle.json';
import competencyCoachFramework from '@/data/frameworks/competency-coach.json';

export type OrgReportCopy = {
  report_title?: string;
  welcome_title?: string;
  welcome_body?: string[];
  framework_title?: string;
  framework_intro?: string[];
  how_to_use?: {
    summary: string;
    bullets: string[];
  };
  how_to_read_scores?: {
    title: string;
    bullets: string[];
  };
  profile_language?: {
    blind_spots_label?: string;
    blind_spots_description?: string;
  };
  images?: {
    framework_banner?: string;
    frequency_diagram?: string;
    profile_grid?: string;
  };
  profiles?: Record<
    string,
    {
      one_liner?: string;
      traits?: string | string[];
      motivators?: string | string[];
      blind_spots?: string | string[];
      example?: string;
    }
  >;
  energy_matrix?: {
    title?: string;
    body?: string[];
  };
};

// We only return the **report** section of each framework JSON
export async function getOrgFramework(orgSlug: string): Promise<OrgReportCopy | null> {
  switch (orgSlug) {
    case 'team-puzzle': {
      const fw = (teamPuzzleFramework as any).framework;
      return fw?.report ?? null;
    }
    case 'competency-coach': {
      const fw = (competencyCoachFramework as any).framework;
      return fw?.report ?? null;
    }
    default:
      return null;
  }
}
