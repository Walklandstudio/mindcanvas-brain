// apps/web/app/api/admin/tests/rephrase/question/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";

type Body = { question_id: string; text: string };

export async function POST(req: Request) {
  const supabase = getServiceClient();

  // parse
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.question_id || !body?.text?.trim()) {
    return NextResponse.json({ error: "question_id and text are required" }, { status: 400 });
  }

  // fetch one row to see which columns exist (prompt is optional by schema)
  const q = await supabase
    .from("org_test_questions")
    .select("*")
    .eq("id", body.question_id)
    .maybeSingle();

  if (q.error) return NextResponse.json({ error: q.error.message }, { status: 500 });
  if (!q.data) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const update: Record<string, any> = { text: body.text.trim() };
  if (Object.prototype.hasOwnProperty.call(q.data, "prompt")) {
    update.prompt = body.text.trim();
  }

  const upd = await supabase
    .from("org_test_questions")
    .update(update)
    .eq("id", body.question_id)
    .select("id")
    .maybeSingle();

  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
