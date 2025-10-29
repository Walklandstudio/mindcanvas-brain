import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: { token: string } }) {
  return NextResponse.json({
    ok: true,
    route: "apps/web/app/api/public/test/[token]/_canary/route.ts",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    token: params.token,
  });
}
