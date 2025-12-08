// apps/web/lib/orgTemplatePacks.ts

export type OrgTemplatePackId = 'qsc-entrepreneurs' | 'qsc-leaders';

export type OrgTemplatePack = {
  id: OrgTemplatePackId;
  label: string;
  description: string;
  templateOrgSlug: string;
  templateTestSlugs: string[];
};

export const ORG_TEMPLATE_PACKS: OrgTemplatePack[] = [
  {
    id: 'qsc-entrepreneurs',
    label: 'QSC Entrepreneur Pack',
    description:
      'Entrepreneur-focused diagnostic and report, based on the Team Puzzle implementation.',
    templateOrgSlug: 'team-puzzle',
    templateTestSlugs: ['qsc-entrepreneurs'], // adjust to your real slug
  },
  {
    id: 'qsc-leaders',
    label: 'QSC Leaders Pack',
    description:
      'Leadership-focused diagnostic and report, based on the Competency Coach implementation.',
    templateOrgSlug: 'competency-coach',
    templateTestSlugs: ['qsc-leaders'], // adjust to your real slug
  },
];
