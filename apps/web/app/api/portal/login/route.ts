// apps/web/app/api/portal/login/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase, getAdminClient } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LoginResponse =
  | {
      ok: true;
      next: string;
      is_superadmin: boolean;
      org_slug: string | null;
    }
  | { ok: false; error: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { email?: string; password?: string }
      | null;

    const email = (body?.email || "").trim();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password required" } satisfies LoginResponse,
        { status: 400 }
      );
    }

    // 1) Sign in with SSR client (sets auth cookies)
    const sb = await getServerSupabase();
    const { data: auth, error } = await sb.auth.signInWithPassword({ email, password });

    if (error || !auth?.user) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Invalid credentials" } satisfies LoginResponse,
        { status: 401 }
      );
    }

    const userId = auth.user.id;

    // 2) Service-role for portal schema lookups
    const admin = await getAdminClient();
    const portal = admin.schema("portal");

    // Superadmin?
    const { data: sa, error: saErr } = await portal
      .from("superadmins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (saErr) {
      return NextResponse.json(
        { ok: false, error: saErr.message } satisfies LoginResponse,
        { status: 400 }
      );
    }

    const is_superadmin = !!sa?.user_id;

    if (is_superadmin) {
      // If your admin UI lives elsewhere, change this target.
      return NextResponse.json(
        { ok: true, is_superadmin: true, org_slug: null, next: "/dashboard" } satisfies LoginResponse,
        { status: 200 }
      );
    }

    // First org membership (NO created_at column exists, so do NOT order)
    const { data: mem, error: mErr } = await portal
      .from("user_orgs")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (mErr) {
      return NextResponse.json(
        { ok: false, error: mErr.message } satisfies LoginResponse,
        { status: 400 }
      );
    }

    if (!mem?.org_id) {
      return NextResponse.json(
        { ok: true, is_superadmin: false, org_slug: null, next: "/onboarding" } satisfies LoginResponse,
        { status: 200 }
      );
    }

    // Resolve slug
    const { data: org, error: oErr } = await portal
      .from("orgs")
      .select("slug")
      .eq("id", mem.org_id)
      .maybeSingle();

    if (oErr) {
      return NextResponse.json(
        { ok: false, error: oErr.message } satisfies LoginResponse,
        { status: 400 }
      );
    }

    const org_slug =
      typeof org?.slug === "string" && org.slug.trim() ? org.slug.trim() : null;

    const next = org_slug ? `/portal/${org_slug}/dashboard` : "/portal";

    return NextResponse.json(
      { ok: true, is_superadmin: false, org_slug, next } satisfies LoginResponse,
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unexpected error" } satisfies LoginResponse,
      { status: 500 }
    );
  }
}
