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

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "portal" },
  });
}

export async function POST(req: Request, ctx: { params: { token: string } }) {
  try {
    const supabase = getAdminClient();
    const token = ctx.params?.token;
    if (!token) return cors(NextResponse.json({ error: "Missing token" }, { status: 400 }));

    const body = (await req.json().catch(() => ({}))) ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    const first_name = body.first_name?.trim() || null;
    const last_name = body.last_name?.trim() || null;
    const company = body.company?.trim() || null;
    const role_title = body.role_title?.trim() || null;
    const meta = body.meta ?? null;

    // 1️⃣ Find link
    const { data: link, error: linkErr } = await supabase
      .from("test_links")
      .select("id, org_id, test_id, token, max_uses, use_count, created_at")
      .eq("token", token)
      .maybeSingle();
    if (linkErr) throw new Error(linkErr.message);
    if (!link) return cors(NextResponse.json({ error: "Test link not found" }, { status: 404 }));

    if (
      typeof link.max_uses === "number" &&
      link.max_uses >= 0 &&
      typeof link.use_count === "number" &&
      link.use_count >= link.max_uses
    ) {
      return cors(NextResponse.json({ error: "Link use limit reached" }, { status: 403 }));
    }

    // 2️⃣ Find test
    const { data: test, error: testErr } = await supabase
      .from("tests")
      .select("id, org_id, name, slug")
      .eq("id", link.test_id)
      .maybeSingle();
    if (testErr) throw new Error(testErr.message);
    if (!test) return cors(NextResponse.json({ error: "Test not found" }, { status: 404 }));

    // 3️⃣ Create test taker
    const nowIso = new Date().toISOString();
    const { data: inserted, error: insErr } = await supabase
      .from("test_takers")
      .insert([
        {
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
        },
      ])
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

    const takerId = inserted?.id;
    if (!takerId)
      return cors(NextResponse.json({ error: "Missing taker id" }, { status: 500 }));

    // 4️⃣ Increment link usage
    await supabase
      .from("test_links")
      .update({ use_count: (link.use_count ?? 0) + 1 })
      .eq("id", link.id);

    // 5️⃣ Return payload
    return cors(
      NextResponse.json(
        {
          ok: true,
          startPath: `/t/${token}/start`,
          test: { id: test.id, name: test.name, slug: test.slug },
          link: { id: link.id, token: link.token },
          taker: { id: takerId, email, status: "started" },
        },
        { status: 200 }
      )
    );
  } catch (err: any) {
    return cors(
      NextResponse.json(
        { error: "Unexpected server error", details: String(err?.message || err) },
        { status: 500 }
      )
    );
  }
}
