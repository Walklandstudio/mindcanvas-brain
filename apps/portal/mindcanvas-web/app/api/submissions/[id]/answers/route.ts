import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

type Primitive = string | number | boolean | null;
type AnswerValue = Primitive | Primitive[];
interface Answer { questionId: string; value: AnswerValue; }
interface SubmissionAnswersPayload { answers: Answer[]; }

function extractIdFromUrl(u: string): string {
  const parts = new URL(u).pathname.split("/");
  const i = parts.indexOf("submissions");
  return i >= 0 ? parts[i + 1] ?? "" : "";
}

function isPayload(x: unknown): x is SubmissionAnswersPayload {
  return !!x && typeof x === "object" && Array.isArray((x as any).answers);
}

export async function POST(req: Request) {
  const id = extractIdFromUrl(req.url);
  const body: unknown = await req.json();
  if (!isPayload(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Example: store answers
  // await supabase.from("answers").insert(body.answers.map(a => ({ submission_id: id, ...a })));

  return NextResponse.json({ ok: true, id, count: body.answers.length });
}

