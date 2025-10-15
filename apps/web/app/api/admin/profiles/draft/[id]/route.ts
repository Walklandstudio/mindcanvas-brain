import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const sb: any = supabaseAdmin();
    const { data, error } = await sb
      .from("profiles_drafts")
      .select("*")
      .eq("id", params.id)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, draft: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Not found" }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { status, content } = await req.json().catch(() => ({}));
    const sb: any = supabaseAdmin();

    const update: any = {};
    if (status) update.status = status;
    if (content) update.content = content;

    const { data, error } = await sb
      .from("profiles_drafts")
      .update(update)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, draft: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 400 });
  }
}
