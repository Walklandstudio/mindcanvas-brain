// mindcanvas-web/app/api/coach/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { getProfileContent, type ProfileContent } from "@/lib/profileContent";

type CoachBody = { submissionId?: string; message?: string };

type ResultPayload = {
  profile?: string | null;
  frequency?: string | null;
  total_score?: number | null;
  scores?: Record<string, unknown> | null;
};
type ResultAPI = { source?: string; result?: ResultPayload | null; error?: string };

type OkResponse = {
  ok: true;
  needsResult?: boolean;
  frequency: string | null;
  profile: string | null;
  profileContent: ProfileContent | null; // ⬅️ nullable
  advice: string[];
};
type ErrResponse = { error: string };

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export async function POST(req: Request) {
  // 1) parse body
  let body: CoachBody;
  try {
    const raw = (await req.json()) as unknown;
    if (!isObj(raw)) throw new Error("Invalid JSON");
    body = {
      submissionId: typeof raw.submissionId === "string" ? raw.submissionId : undefined,
      message: typeof raw.message === "string" ? raw.message : undefined,
    };
  } catch {
    return NextResponse.json<ErrResponse>({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.submissionId) {
    return NextResponse.json<ErrResponse>({ error: "Missing submissionId" }, { status: 400 });
  }

  const db = supabaseServer();

  // 2) absolute origin for server fetch
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  const origin = base || (host ? `${proto}://${host}` : "");

  // 3) basic submission
  const { data: sub, error: subErr } = await db
    .from("mc_submissions")
    .select("id, full_profile_code, full_frequency")
    .eq("id", body.submissionId)
    .maybeSingle();
  if (subErr) return NextResponse.json<ErrResponse>({ error: subErr.message }, { status: 500 });
  if (!sub) return NextResponse.json<ErrResponse>({ error: "Submission not found" }, { status: 404 });

  // 4) ensure result
  let profileKey = (sub.full_profile_code as string | null) ?? null;
  let frequency = (sub.full_frequency as string | null) ?? null;
  let needsResult = false;

  if (!profileKey || !frequency) {
    const res = await fetch(
      `${origin}/api/submissions/${encodeURIComponent(body.submissionId)}/result`,
      { cache: "no-store" }
    );
    const j = (await res.json()) as ResultAPI;
    if (res.ok && j?.result) {
      profileKey = j.result.profile ?? profileKey;
      frequency = j.result.frequency ?? frequency;
      needsResult = true;
    }
  }

  // 5) rich content (DB-backed helper: db first)
  const profileContent = profileKey
    ? await getProfileContent(db, profileKey, "code")
    : null;

  // 6) quick advice scaffolding
  const m = (body.message ?? "").toLowerCase();
  const advice: string[] = [];
  if (m.includes("standup"))
    advice.push("Run 15-minute standups: priorities, blockers, dependencies, owner + deadline.");
  if (m.includes("conflict"))
    advice.push("Surface interests, propose 2 options, agree next step + owner.");
  if (m.includes("feedback"))
    advice.push("Use SBI: Situation → Behavior → Impact, then feed-forward next step.");
  if (advice.length === 0)
    advice.push("Clarify the goal in one sentence, list 3 options, pick one with a next step.");

  const payload: OkResponse = {
    ok: true,
    needsResult,
    frequency: frequency ?? null,
    profile: profileKey ?? null,
    profileContent,
    advice,
  };
  return NextResponse.json(payload);
}

