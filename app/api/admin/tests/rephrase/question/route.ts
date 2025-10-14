// apps/web/app/api/admin/tests/rephrase/question/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceClient } from "../../../../../_lib/supabase";

type Body = { question_id: string; text: string };

export async function POST(req: Request) {
  const sb = getServiceClient();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.question_id || !body?.text?.trim()) {
    return NextResponse.json({ error: "question_id and text are required" }, { status: 400 });
  }

  // Read current row to know which columns exist
  const q = await sb
    .from("org_test_questions")
    .select("*")
    .eq("id", body.question_id)
    .maybeSingle();

  if (q.error) return NextResponse.json({ error: q.error.message }, { status: 500 });
  if (!q.data) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const fields: any = { text: body.text.trim() };
  if (Object.prototype.hasOwnProperty.call(q.data, "prompt")) {
    fields.prompt = body.text.trim();
  }

  const upd = await sb
    .from("org_test_questions")
    .update(fields)
    .eq("id", body.question_id)
    .select("id")
    .maybeSingle();

  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
