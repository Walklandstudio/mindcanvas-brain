// apps/web/types/orgSettings.ts

export type OrgSettings = {
  id: string;
  slug: string;
  name: string;
  industry: string | null;
  short_bio: string | null;
  time_zone: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_secondary: string | null;
  brand_background: string | null;
  brand_text: string | null;
  brand_accent: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  support_email: string | null;
  website_url: string | null;
  phone_number: string | null;
  report_from_name: string | null;
  report_from_email: string | null;
  report_signoff_line: string | null;
  report_footer_notes: string | null;
};
