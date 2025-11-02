// apps/web/app/api/test/[token]/start/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// CORS — adjust the origin if you lock this down
const ALLOWED_ORIGIN = "*";

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Vary", "Origin");
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

type StartBody = {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  role_title?: string | null;
  meta?: Record<string, unknown> | null;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // keep your env name; add fallbacks so staging/prod don’t break
  const key =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and one of SUPABASE_SERVICE_ROLE / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
    // IMPORTANT: your tables are in the `portal` schema
    db: { schema: "portal" },
  });
}

// Helper: token validity
function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function POST(req: Request, ctx: { params: { token: string } }) {
  try {
    const supabase = getAdminClient();
    const token = ctx.params?.token;

    if (!token || typeof token !== "string" || token.length < 6) {
      return cors(NextResponse.json({ error: "Invalid token." }, { status: 400 }));
    }

    let body: StartBody = {};
    try {
      body = (await req.json()) ?? {};
    } catch {
      // no body supplied is fine
    }

    const email =
      typeof body.email === "string" && body.email.trim().length > 0
        ? body.email.trim().toLowerCase()
        : null;

    const first_name = body.first_name?.trim() || null;
    const last_name = body.last_name?.trim() || null;
    const company = body.company?.trim() || null;
    const role_title = body.role_title?.trim() || null;
    const meta = body.meta ?? null;

    // 1) Link lookup (portal.test_links)
    const { data: link, error: linkErr } = await supabase
      .from("test_links")
      .select("id, token, org_id, test_id, expires_at, max_uses, use_count, is_disabled")
      .eq("token", token)
      .maybeSingle();

    if (linkErr) {
      return cors(NextResponse.json({ error: "Link lookup failed.", details: linkErr.message }, { status: 500 }));
    }
    if (!link) return cors(NextResponse.json({ error: "Test link not found." }, { status: 404 }));
    if (link.is_disabled === true) return cors(NextResponse.json({ error: "This link is disabled." }, { status: 403 }));
    if (isExpired(link.expires_at)) return cors(NextResponse.json({ error: "This link has expired." }, { status: 410 }));
    if (
      typeof link.max_uses === "number" &&
      link.max_uses >= 0 &&
      typeof link.use_count === "number" &&
      link.use_count >= link.max_uses
    ) {
      return cors(
        NextResponse.json({ error: "This link has reached its maximum number of uses." }, { status: 403 })
      );
    }

    // 2) Test exists / active (portal.tests)
    const { data: test, error: testErr } = await supabase
      .from("tests")
      .select("id, org_id, name, slug, is_active")
      .eq("id", link.test_id)
      .maybeSingle();

    if (testErr) {
      return cors(NextResponse.json({ error: "Test lookup failed.", details: testErr.message }, { status: 500 }));
    }
    if (!test) return cors(NextResponse.json({ error: "Test not found." }, { status: 404 }));
    if (test.org_id !== link.org_id) return cors(NextResponse.json({ error: "Test not in this org." }, { status: 403 }));
    if (test.is_active === false) return cors(NextResponse.json({ error: "This test is not active." }, { status: 403 }));

    // 3) Upsert/insert test taker (with contact fields) in portal.test_takers
    const nowIso = new Date().toISOString();
    let takerId: string | null = null;
    let newlyCreated = false;

    if (email) {
      const { data: existing, error: existErr } = await supabase
        .from("test_takers")
        .select("id, status")
        .match({ org_id: link.org_id, test_id: link.test_id, email })
        .maybeSingle();

      if (existErr) {
        return cors(NextResponse.json({ error: "Lookup test taker failed.", details: existErr.message }, { status: 500 }));
      }

      if (existing?.id) {
        takerId = existing.id;
        await supabase
          .from("test_takers")
          .update({
            status: "started",
            started_at: nowIso,
            link_token: token,
            first_name,
            last_name,
            company,
            role_title,
            meta,
          })
          .eq("id", takerId);
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("test_takers")
          .insert({
            org_id: link.org_id,
            test_id: link.test_id,
            email,
            first_name,
            last_name,
            company,
            role_title,
            status: "started",
            started_at: nowIso,
            link_token: token,
            meta,
          })
          .select("id")
          .maybeSingle();

        if (insErr) {
          const dup = typeof insErr.message === "string" && insErr.message.toLowerCase().includes("duplicate key");
          if (dup) {
            const { data: reget } = await supabase
              .from("test_takers")
              .select("id")
              .match({ org_id: link.org_id, test_id: link.test_id, email })
              .maybeSingle();
            takerId = reget?.id ?? null;
          } else {
            return cors(NextResponse.json({ error: "Could not start test.", details: insErr.message }, { status: 500 }));
          }
        } else {
          takerId = inserted?.id ?? null;
          newlyCreated = true;
        }
      }
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("test_takers")
        .insert({
          org_id: link.org_id,
          test_id: link.test_id,
          email: null,
          first_name,
          last_name,
          company,
          role_title,
          status: "started",
          started_at: nowIso,
          link_token: token,
          meta,
        })
        .select("id")
        .maybeSingle();

      if (insErr) {
        return cors(NextResponse.json({ error: "Could not start test.", details: insErr.message }, { status: 500 }));
      }
      takerId = inserted?.id ?? null;
      newlyCreated = true;
    }

    if (!takerId) {
      return cors(NextResponse.json({ error: "Failed to create or retrieve test taker." }, { status: 500 }));
    }

    // 4) Increment use_count if newly created (portal.test_links)
    if (newlyCreated) {
      await supabase.from("test_links").update({ use_count: (link.use_count ?? 0) + 1 }).eq("id", link.id);
    }

    // 5) Respond (includes taker_id so callers can add ?tid=)
    return cors(
      NextResponse.json(
        {
          ok: true as const,
          startPath: `/t/${token}/start`,
          test: { id: test.id, name: test.name ?? null, slug: test.slug ?? null },
          link: { id: link.id, token: link.token, expires_at: link.expires_at },
          taker: { id: takerId, email, status: "started" as const },
        },
        { status: 200 }
      )
    );
  } catch (err: any) {
    return cors(
      NextResponse.json(
        {
          error: "Unexpected server error.",
          details: typeof err?.message === "string" ? err.message : String(err),
        },
        { status: 500 }
      )
    );
  }
}
