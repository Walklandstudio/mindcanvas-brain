import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceClient } from "@/app/_lib/supabase";
import { randomUUID } from "crypto";

const TABLE = "org_onboarding";
const ORG_COOKIE = "mc_org_id";

/** shape we persist in `data` column */
type OnboardingData = {
  account?: Record<string, unknown>;
  company?: {
    website?: string;
    linkedin?: string;
    industry?: string;
    sector?: string;
  };
  branding?: Record<string, unknown>;
  goals?: Record<string, unknown>;
  progress?: number;
};

function newDefault(): OnboardingData {
  return { account: {}, company: {}, branding: {}, goals: {}, progress: 0 };
}

export async function GET() {
  // NOTE: in this Next version, cookies() is async
  const cookieStore = await cookies();
  let orgId = cookieStore.get(ORG_COOKIE)?.value;

  // If no org cookie yet, set one and return defaults
  if (!orgId) {
    orgId = randomUUID();
    const res = NextResponse.json(newDefault());
    res.cookies.set(ORG_COOKIE, orgId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 180, // 6 months
      path: "/",
    });
    return res;
  }

  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("data")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      // Soft default if table missing / row not found / RLS etc.
      return NextResponse.json(newDefault(), { status: 200 });
    }

    return NextResponse.json((data?.data as OnboardingData) ?? newDefault(), { status: 200 });
  } catch {
    // Any unexpected error -> default so the UI remains usable
    return NextResponse.json(newDefault(), { status: 200 });
  }
}
