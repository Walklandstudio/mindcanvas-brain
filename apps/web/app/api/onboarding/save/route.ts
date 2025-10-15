import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient } from "@/app/_lib/supabase";
import { randomUUID } from "crypto";

const TABLE = "org_onboarding";
const ORG_COOKIE = "mc_org_id";

type Company = { website?: string; linkedin?: string; industry?: string; sector?: string };
type Body = {
  step: "company" | "account" | "branding" | "goals";
  data: unknown;
  recomputeProgress?: boolean;
};

function computeProgress(d: any): number {
  let total = 0;
  let filled = 0;

  // company (4)
  total += 4;
  if (d?.company?.website) filled++;
  if (d?.company?.linkedin) filled++;
  if (d?.company?.industry) filled++;
  if (d?.company?.sector) filled++;

  // account (example fields – adjust or leave)
  if (d?.account) {
    const keys = ["email", "name"];
    total += keys.length;
    filled += keys.filter((k) => (d.account?.[k] ?? "").toString().trim()).length;
  }

  // branding (example)
  if (d?.branding) {
    const keys = ["logoUrl"];
    total += keys.length;
    filled += keys.filter((k) => (d.branding?.[k] ?? "").toString().trim()).length;
  }

  // goals (example)
  if (d?.goals) {
    const keys = ["primaryGoal"];
    total += keys.length;
    filled += keys.filter((k) => (d.goals?.[k] ?? "").toString().trim()).length;
  }

  if (total === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((filled / total) * 100)));
}

export async function POST(req: Request) {
  const supabase = getServiceClient();

  const cookieStore = await cookies();
  let orgId = cookieStore.get(ORG_COOKIE)?.value;
  if (!orgId) orgId = randomUUID();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.step || !body?.data) {
    return NextResponse.json({ message: "Missing step or data" }, { status: 400 });
  }

  // Fetch current state (if any)
  const { data: existing, error: selErr } = await supabase
    .from(TABLE)
    .select("data")
    .eq("org_id", orgId)
    .maybeSingle();

  if (selErr && !/row not found/i.test(selErr.message || "")) {
    // If table exists problem (e.g., missing column), surface it clearly
    return NextResponse.json({ message: selErr.message || "Select failed" }, { status: 500 });
  }

  const current = (existing?.data as any) ?? {};
  const merged = { ...current };

  if (body.step === "company") merged.company = { ...(current.company ?? {}), ...(body.data as Company) };
  if (body.step === "account") merged.account = { ...(current.account ?? {}), ...(body.data as Record<string, unknown>) };
  if (body.step === "branding") merged.branding = { ...(current.branding ?? {}), ...(body.data as Record<string, unknown>) };
  if (body.step === "goals") merged.goals = { ...(current.goals ?? {}), ...(body.data as Record<string, unknown>) };

  if (body.recomputeProgress) {
    merged.progress = computeProgress(merged);
  }

  const { error: upErr } = await supabase
    .from(TABLE)
    .upsert(
      {
        org_id: orgId,
        data: merged,
        progress: merged.progress ?? computeProgress(merged),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" }
    );

  if (upErr) {
    return NextResponse.json({ message: upErr.message || "Upsert failed" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, data: merged }, { status: 200 });
  if (!cookieStore.get(ORG_COOKIE)?.value) {
    res.cookies.set(ORG_COOKIE, orgId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 180,
      path: "/",
    });
  }
  return res;
}
