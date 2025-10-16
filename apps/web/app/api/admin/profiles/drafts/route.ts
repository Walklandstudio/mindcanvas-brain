import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase/server";

export const runtime = "nodejs";

function extractId(req: Request) {
  const { pathname } = new URL(req.url);
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1]; // .../drafts/<id>
}

export async function GET(req: Request) {
  try {
    const id = extractId(req);
    if (!id) throw new Error("Missing id");

    const sb: any = supabaseAdmin();
    const { data, error } = await sb
      .from("profiles_drafts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, draft: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Not found" }, { status: 404 });
  }
}

export async function PATCH(req: Request) {
  try {
    const id = extractId(req);
    if (!id) throw new Error("Missing id");

    const { status, content } = await req.json().catch(() => ({}));
    const update: any = {};
    if (status) update.status = status;
    if (content) update.content = content;

    const sb: any = supabaseAdmin();
    const { data, error } = await sb
      .from("profiles_drafts")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, draft: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 400 });
  }
}
