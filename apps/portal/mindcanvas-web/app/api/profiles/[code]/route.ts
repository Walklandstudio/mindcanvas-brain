// app/api/profiles/[code]/route.ts
import { NextResponse } from "next/server";
import { getProfileContent } from "@/lib/profileContent";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;

  try {
    // pass the selector explicitly: we're looking up by profile CODE
    const content = await getProfileContent(code, "code");
    return NextResponse.json({ ok: true, content });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
