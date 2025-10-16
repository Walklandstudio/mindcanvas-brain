export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";

export async function POST(req: Request) {
  try {
    const { answer_id, text } = await req.json();
    if (!answer_id || !text) throw new Error("Missing answer_id or text");

    const sb = getServiceClient();

    const up = await sb
      .from("org_test_answers")
      .update({ text })
      .eq("id", answer_id)
      .select("id")
      .maybeSingle();

    if (up.error) throw up.error;
    if (!up.data?.id) throw new Error("Answer not found");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Rephrase failed" }, { status: 400 });
  }
}
