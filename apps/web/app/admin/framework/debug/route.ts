import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ ok:false, reason:"OpenAI disabled" });
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });
  return NextResponse.json({ ok:true });
}
