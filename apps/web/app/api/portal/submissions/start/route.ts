import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabaseAdmin";

export async function POST(req: Request) {
  const sb = supabaseAdmin();
  const { token } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const { data: link } = await sb
    .from("test_links")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  if (link.expires_at && new Date(link.expires_at) < new Date())
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  if (link.max_uses !== null && (link.uses ?? 0) >= link.max_uses)
    return NextResponse.json({ error: "Link already used" }, { status: 409 });

  const { data: sub, error } = await sb
    .from("test_submissions")
    .insert([{ org_id: link.org_id, test_id: link.test_id, taker_id: link.taker_id ?? null, link_id: link.id }])
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await sb.from("test_links").update({ uses: (link.uses ?? 0) + 1 }).eq("id", link.id);

  return NextResponse.json({ submission: sub });
}
