// apps/portal/app/api/coach/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { getProfileContent, type ProfileContent } from "@/lib/profileContent";

export const runtime = "nodejs";

type CoachBody = { submissionId?: string; message?: string };

// If you’re using RLS by anon key, supabaseServer is already scoped for server-side.
// For privileged ops, use supabaseAdmin instead.
export async function POST(req: Request, _ctx: any) {
  try {
    const h = headers(); // if you need auth headers/cookies later

    // 1) parse body
    let body: CoachBody | null = null;
    try {
      body = (await req.json()) as CoachBody;
    } catch {
      /* ignore empty body */
    }

    const submissionId = body?.submissionId ?? "";
    const message = body?.message ?? "";

    // 2) base URL (optional; remove if unused)
    const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

    // 3) Supabase server client (NOTE: not a function call)
    const db = supabaseServer;

    // -- Example (adjust to your schema) --
    // const { data: submission } = await db
    //   .from("submissions")
    //   .select("*")
    //   .eq("id", submissionId)
    //   .single();

    // 4) Example profile content usage
    const exampleProfileKey = "P1" as const;
    const profile: ProfileContent = getProfileContent(exampleProfileKey);

    // TODO: replace with your real coaching logic
    return NextResponse.json({
      ok: true,
      submissionId,
      echoedMessage: message,
      profile,
      base,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


