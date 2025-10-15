import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase/server";

export const runtime = "nodejs";

type Body = {
  draftId?: string;               // optional: update existing
  orgId?: string | null;
  profileName: string;
  frequency: "A" | "B" | "C" | "D";
  content: any;                   // 10-section JSON
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const sb: any = supabaseAdmin(); // <- untyped to avoid 'never' errors

    if (body.draftId) {
      const { data, error } = await sb
        .from("profiles_drafts")
        .update({ content: body.content, status: "draft" })
        .eq("id", body.draftId)
        .select("id")
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, id: data.id });
    }

    const { data, error } = await sb
      .from("profiles_drafts")
      .insert([
        {
          org_id: body.orgId ?? null,
          profile_name: body.profileName,
          frequency: body.frequency,
          content: body.content,
          status: "draft",
        },
      ])
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Save failed" }, { status: 400 });
  }
}
