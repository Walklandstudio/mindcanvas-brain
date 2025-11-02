import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  testKey?: string;       // tests.slug or tests.id within org
  kind?: "full" | "free";
  maxUses?: number | null;
  expiresAt?: string | null; // ISO string
};

function makeToken(prefix = "tp"): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "portal" },
  });
}

async function getActiveOrgId(sb: ReturnType<typeof getAdminClient>) {
  const c = await cookies(); // FIX: await the Promise
  const byId = c.get("active_org_id")?.value?.trim();
  if (byId) return byId;

  const slug = c.get("active_org_slug")?.value?.trim();
  if (!slug) return null;

  const { data } = await sb
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

/** POST /api/portal/links — create a new test link for the active org */
export async function POST(req: Request) {
  try {
    const sb = getAdminClient();
    const orgId = await getActiveOrgId(sb);
    if (!orgId) return NextResponse.json({ error: "No active org" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const testKey = (body.testKey || "").trim();
    const kind = (body.kind || "full") as "full" | "free";
    const mode = kind; // your schema keeps 'mode' NOT NULL
    const maxUses =
      Number.isFinite(body.maxUses as any) && body.maxUses! >= 0
        ? Number(body.maxUses)
        : 1;
    const expiresAt = body.expiresAt ? new Date(body.expiresAt).toISOString() : null;

    if (!testKey) {
      return NextResponse.json({ error: "Missing testKey (slug or id)" }, { status: 400 });
    }

    // Resolve tests (scoped to org): prefer id, then slug
    let testId: string | null = null;

    const byId = await sb
      .from("tests")
      .select("id, org_id, slug")
      .eq("org_id", orgId)
      .eq("id", testKey)
      .maybeSingle();

    if (byId.data?.id) {
      testId = byId.data.id;
    } else {
      const bySlug = await sb
        .from("tests")
        .select("id, org_id, slug")
        .eq("org_id", orgId)
        .eq("slug", testKey)
        .maybeSingle();
      testId = bySlug.data?.id ?? null;
    }

    if (!testId) {
      return NextResponse.json(
        { error: `Test not found in org; looked for "${testKey}" (id or slug)` },
        { status: 404 }
      );
    }

    const token = makeToken("tp");

    const { data, error } = await sb
      .from("test_links")
      .insert([
        {
          org_id: orgId,
          test_id: testId,
          token,
          max_uses: maxUses,
          expires_at: expiresAt,
          kind,
          mode,     // NOT NULL in your schema
          uses: 0,  // initialize if present
        } as any,
      ])
      .select("id, token")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const appOrigin = process.env.APP_ORIGIN || "";
    const url =
      appOrigin && appOrigin.startsWith("http")
        ? `${appOrigin.replace(/\/+$/, "")}/t/${token}`
        : `/t/${token}`;

    return NextResponse.json({ token: data?.token ?? token, url }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

/** DELETE /api/portal/links — { id?: string, token?: string } */
export async function DELETE(req: Request) {
  try {
    const sb = getAdminClient();
    const orgId = await getActiveOrgId(sb);
    if (!orgId) return NextResponse.json({ error: "No active org" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as { id?: string; token?: string };
    const id = (body.id || "").trim();
    const token = (body.token || "").trim();
    if (!id && !token) {
      return NextResponse.json({ error: "Provide id or token" }, { status: 400 });
    }

    const q = sb.from("test_links").delete().eq("org_id", orgId);
    if (id) q.eq("id", id);
    if (token) q.eq("token", token);

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
