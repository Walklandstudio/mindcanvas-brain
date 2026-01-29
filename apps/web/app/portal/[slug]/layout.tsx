// apps/web/app/portal/[slug]/layout.tsx
import "server-only";
import { ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import BackgroundGrid from "@/components/ui/BackgroundGrid";
import PortalChrome from "@/components/portal/PortalChrome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
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
};

async function loadOrg(slug: string): Promise<Org | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb
    .schema("portal")
    .from("orgs")
    .select(
      "slug,name,brand_name,brand_primary,brand_secondary,brand_accent,brand_text,report_font_family,report_font_size,logo_url"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) return null;
  return (data as Org) ?? null;
}

export default async function OrgLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { slug: string };
}) {
  const org = await loadOrg(params.slug);

  // ✅ Put your brand variables on a wrapping div (NOT <html>)
  const vars: Record<string, string> = {
    "--brand-primary": org?.brand_primary ?? "#2d8fc4",
    "--brand-secondary": org?.brand_secondary ?? "#015a8b",
    "--brand-accent": org?.brand_accent ?? "#64bae2",
    "--brand-text": org?.brand_text ?? "#111827",
    "--report-font-family": org?.report_font_family ?? "Inter, sans-serif",
    "--report-font-size": org?.report_font_size ?? "14px",
  };

  return (
    <div
      style={vars as any}
      className="relative min-h-screen bg-[#050914] text-white overflow-x-hidden"
    >
      {/* 🔵 MindCanvas dark grid background */}
      <BackgroundGrid />

      {/* Portal nav + content */}
      <div
        className="relative z-10"
        style={{ fontFamily: "var(--report-font-family)" }}
      >
        <PortalChrome
          orgSlug={params.slug}
          orgName={org?.brand_name ?? org?.name ?? params.slug}
        >
          {children}
        </PortalChrome>
      </div>
    </div>
  );
}

