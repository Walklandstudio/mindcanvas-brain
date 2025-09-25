import { NextResponse } from "next/server";

function getSlugFromUrl(u: string): string {
  const parts = new URL(u).pathname.split("/");
  const i = parts.indexOf("tests");
  return i >= 0 ? parts[i + 1] ?? "" : "";
}

export async function GET(req: Request) {
  const slug = getSlugFromUrl(req.url);
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  return NextResponse.json({ ok: true, slug });
}



