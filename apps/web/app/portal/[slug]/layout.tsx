import { ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";

// Force server Node runtime + dynamic render (no prerender cache)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Org = {
  slug: string;
  name: string;
  brand_name?: string | null;
  brand_primary?: string | null;
  brand_secondary?: string | null;
  brand_accent?: string | null;
  brand_text?: string | null;
  report_font_family?: string | null;
  report_font_size?: string | null;
  logo_url?: string | null;
  watermark?: string | null;
  report_cover_tagline?: string | null;
  report_disclaimer?: string | null;
};

async function loadOrg(slug: string): Promise<Org | null> {
  // Guard for env so we don't crash the layout
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("portal.orgs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("org load error:", error.message);
    return null;
  }
  return (data as Org) ?? null;
}

export default async function OrgLayout({
  children,
  params
}: { children: ReactNode; params: { slug: string } }) {
  const org = await loadOrg(params.slug);

  // Safe defaults if org not found or env missing
  const vars: Record<string, string> = {
    "--brand-primary": org?.brand_primary ?? "#2d8fc4",
    "--brand-secondary": org?.brand_secondary ?? "#015a8b",
    "--brand-accent": org?.brand_accent ?? "#64bae2",
    "--brand-text": org?.brand_text ?? "#111827",
    "--report-font-family": org?.report_font_family ?? "Inter, sans-serif",
    "--report-font-size": org?.report_font_size ?? "14px",
  };

  return (
    <html style={vars as any}>
      <body style={{ fontFamily: "var(--report-font-family)" }} className="text-[var(--brand-text)]">
        {children}
      </body>
    </html>
  );
}
