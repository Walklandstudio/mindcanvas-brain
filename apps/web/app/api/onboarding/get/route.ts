import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient } from "@/app/_lib/supabase";
import { randomUUID } from "crypto";

const TABLE = "org_onboarding";
const ORG_COOKIE = "mc_org_id";

type OnboardingData = {
  account?: Record<string, unknown>;
  company?: { website?: string; linkedin?: string; industry?: string; sector?: string };
  branding?: Record<string, unknown>;
  goals?: Record<string, unknown>;
  progress?: number;
};

function newDefault(): OnboardingData {
  return { account: {}, company: {}, branding: {}, goals: {}, progress: 0 };
}

export async function GET() {
  const cookieStore = await cookies();
  let orgId = cookieStore.get(ORG_COOKIE)?.value;

  if (!orgId) {
    orgId = randomUUID();
    const res = NextResponse.json(newDefault());
    res.cookies.set(ORG_COOKIE, orgId, {
      httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 180, path: "/",
    });
    return res;
  }

  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("data, progress")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) return NextResponse.json(newDefault(), { status: 200 });

    const payload = (data?.data as OnboardingData) ?? newDefault();
    if (typeof data?.progress === "number") payload.progress = data.progress;
    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(newDefault(), { status: 200 });
  }
}
