import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  orgId: string;
  name?: string;
  logoUrl?: string;
};

function isLikelyId(s: string) {
  // Accept UUID v4, ULID (26 Crockford base32), or generic 24–36 char lowercase/nums (cuid-ish)
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  const cuidish = /^[a-z0-9_-]{24,36}$/i;
  return uuid.test(s) || ulid.test(s) || cuidish.test(s);
}

// Tolerant parse: trims, removes accidental leading ":", validates shape
function parse(body: unknown): Body {
  if (!body || typeof body !== "object") throw new Error("Missing body");
  const b = body as Record<string, unknown>;
  let orgId = String(b.orgId ?? "").trim();
  if (orgId.startsWith(":")) orgId = orgId.slice(1); // fix ":org_id" bug
  if (!isLikelyId(orgId)) throw new Error("Invalid orgId");

  const name = b.name ? String(b.name) : undefined;
  const logoUrl = b.logoUrl ? String(b.logoUrl) : undefined;
  return { orgId, name, logoUrl };
}

export async function POST(req: Request) {
  try {
    const payload = parse(await req.json());
    const supabase = supabaseAdmin();

    const patch: { name?: string; logo_url?: string | null } = {};
    if (payload.name) patch.name = payload.name;
    if (payload.logoUrl) patch.logo_url = payload.logoUrl;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, message: "Nothing to update" });
    }

    // Ensure org exists (helps catch bad ids earlier)
    const { data: existing, error: orgErr } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", payload.orgId)
      .maybeSingle();

    if (orgErr) {
      return NextResponse.json({ error: orgErr.message }, { status: 400 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("organizations")
      .update(patch)
      .eq("id", payload.orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, organization: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }
}
