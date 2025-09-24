import { NextRequest, NextResponse } from "next/server";

type RouteParams = { id: string };

type Primitive = string | number | boolean | null;
type AnswerValue = Primitive | Primitive[];

interface Answer {
  questionId: string;
  value: AnswerValue;
}

interface SubmissionAnswersPayload {
  answers: Answer[];
}

export async function POST(
  req: NextRequest,
  { params }: { params: RouteParams } // <-- no `any`
) {
  const { id } = params;

  const json = (await req.json()) as unknown;

  // Runtime guard so we never rely on `any`
  if (
    typeof json !== "object" ||
    json === null ||
    !("answers" in json) ||
    !Array.isArray((json as Record<string, unknown>).answers)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = json as SubmissionAnswersPayload;

  // TODO: persist `payload.answers` for submission `id`
  return NextResponse.json({ ok: true, id, count: payload.answers.length });
}
