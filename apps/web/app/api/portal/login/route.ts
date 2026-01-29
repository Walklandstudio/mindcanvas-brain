import { NextResponse } from "next/server";
import { getServerSupabase, getAdminClient } from "@/app/_lib/portal";

export const dynamic = "force-dynamic";

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
    const body = await req.json();
    const email = (body?.email || "").trim();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    // 1) Authenticate + set SSR cookies
    const sb = await getServerSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error || !data?.user) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Invalid credentials" },
        { status: 401 }
      );
    }

    const userId = data.user.id;

    // 2) Admin check (service role)
    const admin = await getAdminClient();
    const portal = admin.schema("portal");

    const { data: adminRow } = await portal
      .from("superadmin") // ✅ singular
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    const is_superadmin = !!adminRow?.user_id;

    if (is_superadmin) {
      return NextResponse.json({
        ok: true,
        is_superadmin: true,
        org_slug: null,
        next: "/admin",
      });
    }

    // 3) Org user
    const { data: mem } = await portal
      .from("user_orgs")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (!mem?.org_id) {
      return NextResponse.json({
        ok: true,
        is_superadmin: false,
        org_slug: null,
        next: "/onboarding",
      });
    }

    const { data: org } = await portal
      .from("orgs")
      .select("slug")
      .eq("id", mem.org_id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      is_superadmin: false,
      org_slug: org?.slug ?? null,
      next: org?.slug ? `/portal/${org.slug}/dashboard` : "/portal",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}


