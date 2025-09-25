import { NextResponse } from "next/server";
import { extractParamFromUrl } from "@/lib/routeParams";
// import { supabaseServer } from "@/lib/supabaseServer";

type Primitive = string | number | boolean | null;
type AnswerValue = Primitive | Primitive[];
interface Answer { questionId: string; value: AnswerValue; }
interface SubmissionAnswersPayload { answers: Answer[]; }

function isPayload(x: unknown): x is SubmissionAnswersPayload {
  return !!x && typeof x === "object" && Array.isArray((x as Record<string, unknown>).answers);
}

export async function POST(req: Request) {
  const id = extractParamFromUrl(req.url, "submissions");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body: unknown = await req.json();
  if (!isPayload(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // const supabase = supabaseServer();
  // await supabase.from("answers").insert(body.answers.map(a => ({ submission_id: id, ...a })));

  return NextResponse.json({ ok: true, id, count: body.answers.length });
}

