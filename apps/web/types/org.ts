// apps/web/types/org.ts
export type OrgProfile = {
  id: string;
  org_id: string;
  framework_id: string;
  name: string;
  frequency: 'A'|'B'|'C'|'D';
  ordinal: number;
};