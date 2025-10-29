import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * Returns frequency + profile metadata for the test behind a link token.
 * This version does NOT read portal.profiles (which you don't have).
 * It builds a safe default map and, when possible, infers existing profile/frequency
 * codes from portal.test_results for the same test.
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const sb = createClient().schema("portal");

    // 1) Find the test for this token
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("id, test_id, org_id, token")
      .eq("token", token)
      .maybeSingle();

    if (linkErr) {
      return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });
    }
    if (!link) {
      return NextResponse.json({ ok: false, error: "Link not found" }, { status: 404 });
    }

    // 2) Try infer profile/frequency codes seen for this test from results (if any)
    //    This keeps us flexible with your existing schema and avoids portal.profiles.
    const { data: inferred, error: infErr } = await sb
      .from("test_results")
      .select("profile_code, frequency_code")
      .eq("test_id", link.test_id)
      .not("profile_code", "is", null)
      .not("frequency_code", "is", null)
      .limit(1000);

    if (infErr) {
      // don't fail the endpoint, just fall back to defaults
      console.warn("[meta] test_results inference failed:", infErr.message);
    }

    // Build a unique set from any existing results
    const seen = new Map<string, string>(); // profile_code -> frequency_code
    for (const r of inferred ?? []) {
      if (r.profile_code) {
        const key = String(r.profile_code);
        if (r.frequency_code && !seen.has(key)) {
          seen.set(key, String(r.frequency_code));
        }
      }
    }

    // 3) Safe defaults if nothing inferred:
    // Profiles 1..8 mapped A,A,B,B,C,C,D,D
    const defaultProfiles = [
      { code: "1", name: "Profile 1", frequency: "A" },
      { code: "2", name: "Profile 2", frequency: "A" },
      { code: "3", name: "Profile 3", frequency: "B" },
      { code: "4", name: "Profile 4", frequency: "B" },
      { code: "5", name: "Profile 5", frequency: "C" },
      { code: "6", name: "Profile 6", frequency: "C" },
      { code: "7", name: "Profile 7", frequency: "D" },
      { code: "8", name: "Profile 8", frequency: "D" },
    ];

    // If we inferred anything from results, overlay it on defaults
    const profiles = defaultProfiles.map((p) => {
      const inferredFreq = seen.get(p.code);
      return inferredFreq ? { ...p, frequency: inferredFreq } : p;
    });

    // Frequencies (static labels; you can rename later per-org if you store branding)
    const frequencies = [
      { code: "A", name: "Frequency A" },
      { code: "B", name: "Frequency B" },
      { code: "C", name: "Frequency C" },
      { code: "D", name: "Frequency D" },
    ];

    // 4) Thresholds: if you already store them, try read; otherwise give an empty array
    //    (Keeps the UI happy; your result page can still render with totals from test_results)
    const { data: thresholds, error: thrErr } = await sb
      .from("test_thresholds") // if you don't have this table, we'll catch the error below
      .select("*")
      .eq("test_id", link.test_id);

    const payload = {
      ok: true,
      test_id: link.test_id,
      org_id: link.org_id,
      frequencies,
      profiles,
      thresholds: thrErr ? [] : (thresholds ?? []),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "Unknown error" }, { status: 500 });
  }
}

