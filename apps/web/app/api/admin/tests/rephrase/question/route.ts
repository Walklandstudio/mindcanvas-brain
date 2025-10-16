export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";

export async function POST(req: Request) {
  try {
    const { question_id, text } = await req.json();
    if (!question_id || !text) throw new Error("Missing question_id or text");

    const sb = getServiceClient();

    // Try to update both text + prompt (if column exists), with fallbacks.
    const attempts = [
      { text, prompt: text },
      { text },
    ];

    let lastErr: string | null = null;
    for (const payload of attempts) {
      const up = await sb
        .from("org_test_questions")
        .update(payload as any)
        .eq("id", question_id)
        .select("id")
        .maybeSingle();

      if (!up.error && up.data?.id) return NextResponse.json({ ok: true });
      lastErr = up.error?.message ?? lastErr;
    }

    throw new Error(lastErr || "Update failed");
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Rephrase failed" }, { status: 400 });
  }
}
