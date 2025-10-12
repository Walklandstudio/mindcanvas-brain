// apps/web/app/api/admin/tests/rephrase/answer/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";

type Body = { question_id: string; answer_id: string; text: string };

export async function POST(req: Request) {
  const sb = getServiceClient();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.question_id || !body?.answer_id || !body?.text?.trim()) {
    return NextResponse.json({ error: "question_id, answer_id and text are required" }, { status: 400 });
  }

  // Ensure the answer belongs to the provided question (defensive)
  const a = await sb
    .from("org_test_answers")
    .select("id,question_id")
    .eq("id", body.answer_id)
    .maybeSingle();

  if (a.error) return NextResponse.json({ error: a.error.message }, { status: 500 });
  if (!a.data) return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  if (a.data.question_id !== body.question_id) {
    return NextResponse.json({ error: "Answer does not belong to the given question" }, { status: 400 });
  }

  // Only update the text; never touch points/mappings (safe for segmentation)
  const upd = await sb
    .from("org_test_answers")
    .update({ text: body.text.trim() })
    .eq("id", body.answer_id)
    .select("id")
    .maybeSingle();

  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
