import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  orgId: string;
  name?: string;
  logoUrl?: string;
};

function parse(body: unknown): Body {
  if (!body || typeof body !== "object") throw new Error("Missing body");
  const b = body as Record<string, unknown>;
  const orgId = String(b.orgId || "");
  if (!/^[0-9a-fA-F-]{36}$/.test(orgId)) throw new Error("Invalid orgId");
  return {
    orgId,
    name: b.name ? String(b.name) : undefined,
    logoUrl: b.logoUrl ? String(b.logoUrl) : undefined,
  };
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
    return NextResponse.json({ error: e?.message ?? "Invalid payload" }, { status: 400 });
  }
}
