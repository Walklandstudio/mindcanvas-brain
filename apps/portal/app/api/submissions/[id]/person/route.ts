import { NextResponse } from "next/server";

export async function POST(req: Request, ctx: any) {
  const submissionId = (ctx?.params?.id ?? "") as string;
  // TODO: implement real logic with submissionId
  return NextResponse.json({ ok: true, submissionId });
}
