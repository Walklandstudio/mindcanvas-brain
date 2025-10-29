import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const sb = createClient().schema("portal");

  try {
    // 1️⃣ Get test_id + org_id from the token
    const { data: link, error: linkErr } = await sb
      .from("test_links")
      .select("test_id, org_id")
      .eq("token", params.token)
      .maybeSingle();

    if (linkErr) throw new Error(linkErr.message);
    if (!link) throw new Error("Invalid test token");

    const testId = link.test_id;

    // 2️⃣ FIRST: Try your label tables
    let profiles: { code: string; name: string; frequency: string }[] = [];
    let frequencies: { code: string; name: string }[] = [];

    try {
      const { data: prof } = await sb
        .from("test_profile_labels")
        .select("profile_code, profile_name, frequency_code")
        .eq("test_id", testId);

      if (prof && prof.length > 0) {
        profiles = prof.map((p) => ({
          code: p.profile_code,
          name: p.profile_name,
          frequency: p.frequency_code,
        }));
      }
    } catch (err) {
      console.warn("test_profile_labels missing:", err);
    }

    try {
      const { data: freq } = await sb
        .from("test_frequency_labels")
        .select("frequency_code, frequency_name")
        .eq("test_id", testId);

      if (freq && freq.length > 0) {
        frequencies = freq.map((f) => ({
          code: f.frequency_code,
          name: f.frequency_name,
        }));
      }
    } catch (err) {
      console.warn("test_frequency_labels missing:", err);
    }

    // 3️⃣ If labels weren’t found, fall back to JSON (meta) for older tests
    if (profiles.length === 0 || frequencies.length === 0) {
      const { data: trow } = await sb
        .from("tests")
        .select("meta")
        .eq("id", testId)
        .maybeSingle();

      if (trow?.meta) {
        const meta = trow.meta;
        if (Array.isArray(meta.profiles)) {
          profiles = meta.profiles.map((p: any) => ({
            code: p.code,
            name: p.name,
            frequency: p.frequency,
          }));
        }
        if (Array.isArray(meta.frequencies)) {
          frequencies = meta.frequencies.map((f: any) => ({
            code: f.code,
            name: f.label || f.name,
          }));
        }
      }
    }

    // 4️⃣ Final fallback (only if nothing found)
    if (profiles.length === 0) {
      profiles = [
        { code: "PROFILE_1", name: "Profile 1", frequency: "A" },
        { code: "PROFILE_2", name: "Profile 2", frequency: "A" },
        { code: "PROFILE_3", name: "Profile 3", frequency: "B" },
        { code: "PROFILE_4", name: "Profile 4", frequency: "B" },
        { code: "PROFILE_5", name: "Profile 5", frequency: "C" },
        { code: "PROFILE_6", name: "Profile 6", frequency: "C" },
        { code: "PROFILE_7", name: "Profile 7", frequency: "D" },
        { code: "PROFILE_8", name: "Profile 8", frequency: "D" },
      ];
    }

    if (frequencies.length === 0) {
      frequencies = [
        { code: "A", name: "Frequency A" },
        { code: "B", name: "Frequency B" },
        { code: "C", name: "Frequency C" },
        { code: "D", name: "Frequency D" },
      ];
    }

    // 5️⃣ Return everything
    return NextResponse.json(
      {
        ok: true,
        test_id: testId,
        org_id: link.org_id,
        profiles,
        frequencies,
        thresholds: [],
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}

