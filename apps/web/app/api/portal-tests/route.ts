// apps/web/app/api/portal-tests/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Supabase env not configured" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const orgSlug = (url.searchParams.get("org") || "").trim();

    if (!orgSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing ?org=slug" },
        { status: 400 }
      );
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const portal = sb.schema("portal");

    // 1) Look up org id from slug
    const { data: org, error: orgError } = await portal
      .from("orgs")
      .select("id")
      .eq("slug", orgSlug)
      .maybeSingle();

    if (orgError) {
      return NextResponse.json(
        { ok: false, error: orgError.message },
        { status: 500 }
      );
    }

    if (!org?.id) {
      return NextResponse.json(
        { ok: false, error: `Org not found for slug "${orgSlug}"` },
        { status: 404 }
      );
    }

    // 2) Fetch tests for this org
    const { data: tests, error: testsError } = await portal
      .from("tests")
      .select("id, name, slug, is_default_dashboard, status, created_at")
      .eq("org_id", org.id)
      .order("is_default_dashboard", { ascending: false })
      .order("created_at", { ascending: true });

    if (testsError) {
      return NextResponse.json(
        { ok: false, error: testsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        org: orgSlug,
        tests:
          tests?.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            is_default_dashboard: t.is_default_dashboard,
            status: t.status,
          })) ?? [],
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
