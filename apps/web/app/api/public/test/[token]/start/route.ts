import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // avoids static type issues on params

// CORS — tighten before prod
const ALLOWED_ORIGIN = "*";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Vary", "Origin");
  return res;
}

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

type StartBody = {
  email?: string | null;
  meta?: Record<string, unknown> | null;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new Error(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  const now = new Date();
  const exp = new Date(expiresAt);
  return exp.getTime() <= now.getTime();
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = getAdminClient();
    const token = params?.token;

    if (!token || typeof token !== "string" || token.length < 6) {
      return withCORS(NextResponse.json({ error: "Invalid token." }, { status: 400 }));
    }

    let body: StartBody = {};
    try {
      body = (await req.json()) ?? {};
    } catch {
      // empty body ok
    }
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim().toLowerCase()
        : null;
    const meta = body.meta ?? null;

    // 1) Link lookup
    const { data: link, error: linkErr } = await supabase
      .from("test_links")
      .select(
        `
        id,
        token,
        org_id,
        test_id,
        expires_at,
        max_uses,
        use_count,
        is_disabled
      `
      )
      .eq("token", token)
      .maybeSingle();

    if (linkErr) {
      return withCORS(
        NextResponse.json(
          { error: "Link lookup failed.", details: linkErr.message },
          { status: 500 }
        )
      );
    }
    if (!link) {
      return withCORS(NextResponse.json({ error: "Test link not found." }, { status: 404 }));
    }
    if (link.is_disabled === true) {
      return withCORS(NextResponse.json({ error: "This link is disabled." }, { status: 403 }));
    }
    if (isExpired(link.expires_at)) {
      return withCORS(NextResponse.json({ error: "This link has expired." }, { status: 410 }));
    }
    if (
      typeof link.max_uses === "number" &&
      link.max_uses >= 0 &&
      typeof link.use_count === "number" &&
      link.use_count >= link.max_uses
    ) {
      return withCORS(
        NextResponse.json(
          { error: "This link has reached its maximum number of uses." },
          { status: 403 }
        )
      );
    }

    // 2) Test exists & belongs to org
    const { data: test, error: testErr } = await supabase
      .from("tests")
      .select("id, org_id, name, slug, is_active")
      .eq("id", link.test_id)
      .maybeSingle();

    if (testErr) {
      return withCORS(
        NextResponse.json(
          { error: "Test lookup failed.", details: testErr.message },
          { status: 500 }
        )
      );
    }
    if (!test) {
      return withCORS(NextResponse.json({ error: "Test not found." }, { status: 404 }));
    }
    if (test.org_id !== link.org_id) {
      return withCORS(NextResponse.json({ error: "Test not in this org." }, { status: 403 }));
    }
    if (test.is_active === false) {
      return withCORS(NextResponse.json({ error: "This test is not active." }, { status: 403 }));
    }

    // 3) Create or reuse test_taker
    const nowIso = new Date().toISOString();
    let takerId: string | null = null;
    let newlyCreated = false;

    if (email) {
      const { data: existing, error: existErr } = await supabase
        .from("test_takers")
        .select("id, status")
        .match({
          org_id: link.org_id,
          test_id: link.test_id,
          email,
        })
        .maybeSingle();

      if (existErr) {
        return withCORS(
          NextResponse.json(
            { error: "Lookup test taker failed.", details: existErr.message },
            { status: 500 }
          )
        );
      }

      if (existing?.id) {
        takerId = existing.id;
        if (existing.status !== "started") {
          await supabase
            .from("test_takers")
            .update({ status: "started", started_at: nowIso, link_token: token })
            .eq("id", takerId);
        }
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("test_takers")
          .insert({
            org_id: link.org_id,
            test_id: link.test_id,
            email,
            status: "started",
            started_at: nowIso,
            link_token: token,
            meta,
          })
          .select("id")
          .maybeSingle();

        if (insErr) {
          const isUniqueViolation =
            typeof insErr.message === "string" &&
            insErr.message.toLowerCase().includes("duplicate key");
          if (isUniqueViolation) {
            const { data: reget } = await supabase
              .from("test_takers")
              .select("id")
              .match({
                org_id: link.org_id,
                test_id: link.test_id,
                email,
              })
              .maybeSingle();
            takerId = reget?.id ?? null;
          } else {
            return withCORS(
              NextResponse.json(
                { error: "Could not start test.", details: insErr.message },
                { status: 500 }
              )
            );
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
          status: "started",
          started_at: nowIso,
          link_token: token,
          meta,
        })
        .select("id")
        .maybeSingle();

      if (insErr) {
        return withCORS(
          NextResponse.json(
            { error: "Could not start test.", details: insErr.message },
            { status: 500 }
          )
        );
      }
      takerId = inserted?.id ?? null;
      newlyCreated = true;
    }

    if (!takerId) {
      return withCORS(
        NextResponse.json(
          { error: "Failed to create or retrieve test taker." },
          { status: 500 }
        )
      );
    }

    // 4) Increment link usage
    if (newlyCreated) {
      try {
        await supabase
          .from("test_links")
          .update({ use_count: (link.use_count ?? 0) + 1 })
          .eq("id", link.id);
      } catch {
        // non-blocking
      }
    }

    // 5) Respond
    return withCORS(
      NextResponse.json(
        {
          ok: true as const,
          startPath: `/t/${token}/start`,
          test: {
            id: test.id,
            name: test.name ?? null,
            slug: test.slug ?? null,
          },
          link: {
            id: link.id,
            token: link.token,
            expires_at: link.expires_at,
          },
          taker: {
            id: takerId,
            email,
            status: "started" as const,
          },
        },
        { status: 200 }
      )
    );
  } catch (err: any) {
    return withCORS(
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
