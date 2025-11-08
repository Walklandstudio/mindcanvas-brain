import { ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";

async function loadOrg(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await supabase
    .from("portal.orgs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export default async function OrgLayout({
  children,
  params
}: { children: ReactNode; params: { slug: string } }) {
  const org = await loadOrg(params.slug);

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
