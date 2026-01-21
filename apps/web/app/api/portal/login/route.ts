// apps/web/app/api/portal/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const sb = await getServerSupabase();

    const body = await req.json().catch(() => null as any);
    if (!body?.email || !body?.password) {
      return NextResponse.json(
        { ok: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    const { email, password } = body as { email: string; password: string };

    // Sign in (SSR helper wires cookies)
    const { data: auth, error } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !auth?.user) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Invalid credentials" },
        { status: 401 }
      );
    }

    const userId = auth.user.id;

    // 1) Superadmin check (portal.superadmins)
    const { data: sa } = await sb
      .schema("portal")
      .from("superadmins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    const is_superadmin = !!sa?.user_id;

    // Superadmin goes to admin portal
    if (is_superadmin) {
      return NextResponse.json(
        { ok: true, is_superadmin, org_slug: null, next: "/dashboard" },
        { status: 200 }
      );
    }

    // 2) Org memberships (portal.user_orgs)
    const { data: mems, error: mErr } = await sb
      .schema("portal")
      .from("user_orgs")
      .select("org_id")
      .eq("user_id", userId);

    if (mErr) {
      return NextResponse.json(
        { ok: false, error: mErr.message },
        { status: 400 }
      );
    }

    // No org membership -> onboarding (or org selector)
    if (!mems || mems.length === 0) {
      return NextResponse.json(
        { ok: true, is_superadmin: false, org_slug: null, next: "/onboarding" },
        { status: 200 }
      );
    }

    // Choose the first org (you can make this “last used” later)
    const orgId = mems[0].org_id;

    // Resolve slug from portal.orgs
    const { data: orgRow, error: oErr } = await sb
      .schema("portal")
      .from("orgs")
      .select("id, slug")
      .eq("id", orgId)
      .maybeSingle();

    if (oErr || !orgRow?.slug) {
      return NextResponse.json(
        { ok: true, is_superadmin: false, org_slug: null, next: "/portal" },
        { status: 200 }
      );
    }

    const org_slug = String(orgRow.slug);

    // Optional: set active org cookie for later use
    const cs = await cookies();
    // @ts-ignore
    cs.set("portal_org_id", String(orgId), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json(
      {
        ok: true,
        is_superadmin: false,
        org_slug,
        next: `/portal/${org_slug}/dashboard`,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}

