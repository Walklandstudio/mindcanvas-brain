// apps/web/app/api/test/[token]/start/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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
  const key =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env missing: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "portal" }, // 👈 pin to portal schema
  });
}

export async function POST(req: Request, ctx: { params: { token: string } }) {
  const supabase = getAdminClient();
  const token = ctx.params?.token;

  try {
    if (!token || typeof token !== "string" || token.length < 6) {
      return cors(NextResponse.json({ error: "Invalid token." }, { status: 400 }));
    }

    let body: StartBody = {};
    try {
      body = (await req.json()) ?? {};
    } catch {
      /* empty body allowed */
    }

    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim().toLowerCase()
        : null;

    const first_name = body.first_name?.trim() || null;
    const last_name = body.last_name?.trim() || null;
    const company = body.company?.trim() || null;
    const role_title = body.role_title?.trim() || null;
    const meta = body.meta ?? null;

    // 1) Link lookup — ONLY columns that exist in portal.test_links
    const { data: link, error: linkErr } = await supabase
      .from("test_links")
      .select("id, token, org_id, test_id, max_uses, use_count")
      .eq("token", token)
      .maybeSingle();

    if (linkErr) {
      return cors(
        NextResponse.json(
          { error: "Link lookup failed.", details: linkErr.message },
          { status: 500 }
        )
      );
    }
    if (!link) {
      return cors(NextResponse.json({ error: "Test link not found." }, { status: 404 }));
    }

    // 2) Usage limit (no expires/is_disabled in your schema)
    const currentUses = Number(link.use_count ?? 0);
    const maxUses =
      typeof link.max_uses === "number" && Number.isFinite(link.max_uses)
        ? (link.max_uses as number)
        : null;
    if (maxUses !== null && currentUses >= maxUses) {
      return cors(
        NextResponse.json(
          { error: "This link has reached its maximum number of uses." },
          { status: 403 }
        )
      );
    }

    // 3) Verify test belongs to org — ONLY columns we know exist
    const { data: test, error: testErr } = await supabase
      .from("tests")
      .select("id, org_id, name, slug")
      .eq("id", link.test_id)
      .maybeSingle();

    if (testErr) {
      return cors(
        NextResponse.json(
          { error: "Test lookup failed.", details: testErr.message },
          { status: 500 }
        )
      );
    }
    if (!test) return cors(NextResponse.json({ error: "Test not found." }, { status: 404 }));
    if (test.org_id !== link.org_id) {
      return cors(NextResponse.json({ error: "Test not in this org." }, { status: 403 }));
    }

    // 4) Upsert/insert test_takers (with contact fields)
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
        return cors(
          NextResponse.json(
            { error: "Lookup test taker failed.", details: existErr.message },
            { status: 500 }
          )
        );
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
          if (insErr.message?.toLowerCase().includes("duplicate key")) {
            const { data: reget } = await supabase
              .from("test_takers")
              .select("id")
              .match({ org_id: link.org_id, test_id: link.test_id, email })
              .maybeSingle();
            takerId = reget?.id ?? null;
          } else {
            return cors(
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
        return cors(
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
      return cors(NextResponse.json({ error: "Failed to create or retrieve test taker." }, { status: 500 }));
    }

    // 5) Bump use_count if newly created
    if (newlyCreated) {
      await supabase.from("test_links").update({ use_count: currentUses + 1 }).eq("id", link.id);
    }

    // 6) Respond (includes taker.id for ?tid=)
    return cors(
      NextResponse.json(
        {
          ok: true as const,
          startPath: `/t/${token}/start`,
          test: { id: test.id, name: test.name ?? null, slug: test.slug ?? null },
          link: { id: link.id, token: link.token },
          taker: { id: takerId, email, status: "started" as const },
        },
        { status: 200 }
      )
    );
  } catch (err: any) {
    return cors(
      NextResponse.json(
        { error: "Unexpected server error.", details: err?.message ?? String(err) },
        { status: 500 }
      )
    );
  }
}
