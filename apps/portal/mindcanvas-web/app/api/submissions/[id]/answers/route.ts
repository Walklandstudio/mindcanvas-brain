import { NextRequest, NextResponse } from 'next/server';

type RouteParams = { id: string };

type AnswerValue = string | number | boolean | string[];
interface Answer {
  questionId: string;
  value: AnswerValue;
}
interface SubmissionAnswersPayload {
  answers: Answer[];
}

export async function POST(
  req: NextRequest,
  ctx: { params: RouteParams }   // <-- no `any`
) {
  const { id } = ctx.params;

  const body: SubmissionAnswersPayload = await req.json(); // <-- typed
  // TODO: handle `body.answers` for `id`
  return NextResponse.json({ ok: true });
}
