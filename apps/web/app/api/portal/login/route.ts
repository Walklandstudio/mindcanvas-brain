// apps/web/app/api/portal/login/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

function parseCookieHeader(header: string | null) {
  const cookie = header || "";
  if (!cookie.trim()) return [];
  return cookie
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((kv) => {
      const idx = kv.indexOf("=");
      return {
        name: idx === -1 ? kv : kv.slice(0, idx),
        value: idx === -1 ? "" : kv.slice(idx + 1),
      };
    });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, error: "Supabase env not configured" } satisfies LoginResponse,
      { status: 500 }
    );
  }

  // We create ONE response object we can attach cookies to
  const res = NextResponse.json({ ok: false } as LoginResponse, { status: 500 });

  const sb = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.get("cookie"));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

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

    // Sign in (cookie persistence via createServerClient cookie wiring)
    const { data: auth, error } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !auth?.user) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Invalid credentials" } satisfies LoginResponse,
        { status: 401 }
      );
    }

    const userId = auth.user.id;

    // 1) Superadmin check
    const { data: sa, error: saErr } = await sb
      .schema("portal")
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
      // Copy cookies from `res` to the final response
      const out = NextResponse.json(
        { ok: true, is_superadmin: true, org_slug: null, next: "/dashboard" } satisfies LoginResponse,
        { status: 200 }
      );
      res.cookies.getAll().forEach((c) => out.cookies.set(c.name, c.value, c));
      return out;
    }

    // 2) Org membership (no join, keeps typing simple)
    const { data: mem, error: mErr } = await sb
      .schema("portal")
      .from("user_orgs")
      .select("org_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (mErr) {
      const out = NextResponse.json(
        { ok: false, error: mErr.message } satisfies LoginResponse,
        { status: 400 }
      );
      res.cookies.getAll().forEach((c) => out.cookies.set(c.name, c.value, c));
      return out;
    }

    if (!mem?.org_id) {
      const out = NextResponse.json(
        { ok: true, is_superadmin: false, org_slug: null, next: "/onboarding" } satisfies LoginResponse,
        { status: 200 }
      );
      res.cookies.getAll().forEach((c) => out.cookies.set(c.name, c.value, c));
      return out;
    }

    // 3) Resolve org slug
    const { data: orgRow, error: oErr } = await sb
      .schema("portal")
      .from("orgs")
      .select("slug")
      .eq("id", mem.org_id)
      .maybeSingle();

    if (oErr) {
      const out = NextResponse.json(
        { ok: false, error: oErr.message } satisfies LoginResponse,
        { status: 400 }
      );
      res.cookies.getAll().forEach((c) => out.cookies.set(c.name, c.value, c));
      return out;
    }

    const org_slug =
      typeof orgRow?.slug === "string" && orgRow.slug.trim() ? orgRow.slug.trim() : null;

    const next = org_slug ? `/portal/${org_slug}/dashboard` : "/portal";

    const out = NextResponse.json(
      { ok: true, is_superadmin: false, org_slug, next } satisfies LoginResponse,
      { status: 200 }
    );
    res.cookies.getAll().forEach((c) => out.cookies.set(c.name, c.value, c));
    return out;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unexpected error" } satisfies LoginResponse,
      { status: 500 }
    );
  }
}


