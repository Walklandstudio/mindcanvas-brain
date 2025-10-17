// apps/web/app/api/portal/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/app/_lib/portal";

export async function POST(req: Request) {
  try {
    const sb = await getServerSupabase();

    // Always parse JSON body; if it fails, return a clear error
    const body = await req.json().catch(() => null as any);
    if (!body || !body.email || !body.password) {
      return NextResponse.json(
        { ok: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    const { email, password } = body as { email: string; password: string };

    // Sign in (SSR helper wires cookies)
    const { data: auth, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }

    // Find memberships; if exactly one, set active org cookie
    const userId = auth.user.id;
    const { data: mems, error: mErr } = await sb
      .from("portal_members")
      .select("org_id")
      .eq("user_id", userId);

    if (mErr) {
      return NextResponse.json({ ok: false, error: mErr.message }, { status: 400 });
    }

    let next = "/portal/home";
    if (!mems || mems.length === 0) {
      next = "/portal/orgs";
    } else if (mems.length === 1) {
      const cs = await cookies();
      // @ts-ignore (Next server runtime supports set)
      cs.set("portal_org_id", mems[0].org_id, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60,
      });
      next = "/portal/home";
    } else {
      next = "/portal/orgs";
    }

    // ✅ Always respond with JSON (no redirects from the API)
    return NextResponse.json({ ok: true, next }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
