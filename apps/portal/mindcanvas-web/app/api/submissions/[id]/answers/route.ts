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

function isSubmissionAnswersPayload(x: unknown): x is SubmissionAnswersPayload {
  if (
    typeof x !== "object" ||
    x === null ||
    !("answers" in x) ||
    !Array.isArray((x as Record<string, unknown>).answers)
  ) return false;
  // (Optional) deeper validation of each answer can go here
  return true;
}

export async function POST(
  req: NextRequest,
  ctx: { params: RouteParams } // <- no "any" here
) {
  const { id } = ctx.params;

  const bodyUnknown: unknown = await req.json(); // <- unknown, not any
  if (!isSubmissionAnswersPayload(bodyUnknown)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = bodyUnknown; // typed by the guard

  // TODO: persist body.answers for submission "id"
  return NextResponse.json({ ok: true, id, count: body.answers.length });
}
