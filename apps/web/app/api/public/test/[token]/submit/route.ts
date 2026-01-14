// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateQscScores } from "@/lib/qsc-scoring";
import { sendTemplatedEmail } from "@/lib/server/emailTemplates";

type AB = "A" | "B" | "C" | "D";
type PMEntry = { points?: number; profile?: string };
type QuestionRow = {
  id: string;
  idx?: number | string | null;
  profile_map?: PMEntry[] | null;
};

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
    String(s || "").trim()
  );
}

function normSlug(v: any) {
  return String(v || "").trim().toLowerCase();
}

// Accept PROFILE_1..8 or P1..P8 → A/B/C/D; fallback if value already starts with A/B/C/D
function profileCodeToFreq(code: string): AB | null {
  const s = String(code || "").trim().toUpperCase();
  let n: number | null = null;
  const m1 = s.match(/^P(?:ROFILE)?[_\s-]?(\d+)$/);
  if (m1) n = Number(m1[1]);
  if (n && n >= 1 && n <= 8) {
    return (n <= 2 ? "A" : n <= 4 ? "B" : n <= 6 ? "C" : "D") as AB;
  }
  const ch = s[0];
  return ch === "A" || ch === "B" || ch === "C" || ch === "D"
    ? (ch as AB)
    : null;
}

function toZeroBasedSelected(row: any): number | null {
  if (row && typeof row.value === "number" && Number.isFinite(row.value)) {
    const sel = row.value - 1;
    return sel >= 0 ? sel : null;
  }
  if (typeof row.index === "number") return row.index;
  if (typeof row.selected === "number") return row.selected;
  if (typeof row.selected_index === "number") return row.selected_index;
  if (row?.value && typeof row.value.index === "number") return row.value.index;
  return null;
}

const asNumber = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

function normalizeEmail(v: any): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : "";
}

function getDefaultInternalEmail() {
  return (
    normalizeEmail(process.env.INTERNAL_NOTIFICATIONS_EMAIL) ||
    "notifications@profiletest.ai"
  );
}

/**
 * GLOBAL wrapper->content resolver:
 * - If tests.meta.wrapper = true:
 *   - Prefer source test by slug when present (qsc-leaders / qsc-core)
 *   - Else default_source_test
 *   - Else source_tests[0]
 */
async function resolveEffectiveTestId(sb: ReturnType<typeof supa>, testRow: any) {
  const meta = testRow?.meta ?? {};
  const isWrapper = meta?.wrapper === true;

  if (!isWrapper) {
    return {
      effectiveTestId: String(testRow?.id),
      resolvedBy: "not_wrapper" as const,
    };
  }

  const sourceTests: string[] = Array.isArray(meta?.source_tests) ? meta.source_tests : [];
  const defaultSource: string | null =
    typeof meta?.default_source_test === "string" ? meta.default_source_test : null;

  // Prefer by slug if we can inspect candidates
  const clean = sourceTests.filter((id) => isUuidLike(id));
  if (clean.length) {
    const { data: candidates } = await sb
      .from("tests")
      .select("id, slug, meta")
      .in("id", clean);

    const list = (candidates ?? []) as any[];

    const leaders = list.find((t) => normSlug(t.slug) === "qsc-leaders");
    if (leaders?.id) {
      return {
        effectiveTestId: String(leaders.id),
        resolvedBy: "meta.source_tests.slug=qsc-leaders" as const,
      };
    }

    const core = list.find((t) => normSlug(t.slug) === "qsc-core");
    if (core?.id) {
      return {
        effectiveTestId: String(core.id),
        resolvedBy: "meta.source_tests.slug=qsc-core" as const,
      };
    }
  }

  if (defaultSource && isUuidLike(defaultSource)) {
    return {
      effectiveTestId: defaultSource,
      resolvedBy: "meta.default_source_test" as const,
    };
  }

  if (sourceTests.length && isUuidLike(sourceTests[0])) {
    return {
      effectiveTestId: sourceTests[0],
      resolvedBy: "meta.source_tests[0]" as const,
    };
  }

  return {
    effectiveTestId: String(testRow?.id),
    resolvedBy: "wrapper_no_sources" as const,
  };
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const takerId: string | undefined = body.taker_id || body.takerId || body.tid;
    if (!takerId) {
      return NextResponse.json({ ok: false, error: "Missing taker_id" }, { status: 400 });
    }

    const answers: any[] = Array.isArray(body.answers) ? body.answers : [];
    const sb = supa();

    // Resolve taker → wrapper test (org-facing)
    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select(
        "id, org_id, test_id, link_token, first_name, last_name, email, company, role_title, phone, last_result_url"
      )
      .eq("id", takerId)
      .eq("link_token", token)
      .maybeSingle();

    if (takerErr || !taker) {
      return NextResponse.json({ ok: false, error: "Taker not found for this token" }, { status: 404 });
    }

    // Load wrapper test row (the one linked to the token)
    const { data: test, error: testErr } = await sb
      .from("tests")
      .select("id, slug, meta, name")
      .eq("id", taker.test_id)
      .maybeSingle();

    if (testErr || !test) {
      return NextResponse.json({ ok: false, error: "Test not found for taker" }, { status: 500 });
    }

    // Determine effective test id for loading questions/labels/scoring
    const { effectiveTestId, resolvedBy } = await resolveEffectiveTestId(sb, test);

    // Wrapper identity (routing/UI)
    const slug: string = (test.slug as string) || "";
    const meta: any = test.meta || {};
    const frameworkType: string = (meta?.frameworkType as string) || "";
    const kind: string = (meta?.kind as string) || "";
    const resultType: string = (meta?.resultType as string) || "";
    const qscVariant: string = (meta?.qsc_variant as string) || "";

    const slugLower = slug.toLowerCase();
    const frameworkTypeLower = frameworkType.toLowerCase();
    const kindLower = kind.toLowerCase();
    const resultTypeLower = resultType.toLowerCase();
    const qscVariantLower = qscVariant.toLowerCase();

    const isQscTest =
      slugLower.startsWith("qsc-") ||
      frameworkTypeLower === "qsc" ||
      kindLower === "qsc" ||
      resultTypeLower === "qsc" ||
      ["entrepreneur", "leader", "leaders"].includes(qscVariantLower) ||
      meta?.test_family === "qsc" ||
      meta?.wrapper === true;

    const isQscEntrepreneur =
      isQscTest && (qscVariantLower === "entrepreneur" || slugLower.includes("core"));

    const qscAudience: "entrepreneur" | "leader" =
      isQscEntrepreneur ? "entrepreneur" : "leader";

    // Load questions FROM effective test
    const { data: questions, error: qErr } = await sb
      .from("test_questions")
      .select("id, idx, profile_map")
      .eq("test_id", effectiveTestId)
      .order("idx", { ascending: true })
      .order("created_at", { ascending: true });

    if (qErr) {
      return NextResponse.json({ ok: false, error: `Questions load failed: ${qErr.message}` }, { status: 500 });
    }

    const byId: Record<string, QuestionRow> = {};
    for (const q of questions || []) byId[q.id] = q;

    // Labels FROM effective test
    const { data: labels, error: labErr } = await sb
      .from("test_profile_labels")
      .select("profile_code, profile_name, frequency_code")
      .eq("test_id", effectiveTestId);

    if (labErr) {
      return NextResponse.json({ ok: false, error: `Labels load failed: ${labErr.message}` }, { status: 500 });
    }

    const nameToCode = new Map<string, string>();
    const codeToFreq = new Map<string, AB>();
    for (const r of labels || []) {
      const code = String(r.profile_code || "").trim();
      const name = String(r.profile_name || "").trim();
      const f = String(r.frequency_code || "").trim().toUpperCase();

      if (name && code) nameToCode.set(name, code);
      if (code) {
        if (f === "A" || f === "B" || f === "C" || f === "D") {
          codeToFreq.set(code, f as AB);
        } else {
          const implied = profileCodeToFreq(code);
          if (implied) codeToFreq.set(code, implied);
        }
      }
    }

    // Compute totals
    const freqTotals: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
    const profileTotals: Record<string, number> = {};

    for (let idx = 0; idx < answers.length; idx++) {
      const row = answers[idx];
      const qid = row?.question_id || row?.qid || row?.id;
      const q: QuestionRow | undefined = qid ? byId[qid] : undefined;
      if (!q || !Array.isArray(q.profile_map) || q.profile_map.length === 0) continue;

      const sel = toZeroBasedSelected(row);
      if (sel == null || sel < 0 || sel >= q.profile_map.length) continue;

      const entry = q.profile_map[sel] || {};
      const points = asNumber(entry.points, 0);
      let pcode = String(entry.profile || "").trim();

      // Resolve profile name -> code
      if (pcode && !/^P(?:ROFILE)?[_\s-]?\d+$/i.test(pcode)) {
        const fromName = nameToCode.get(pcode);
        if (fromName) pcode = fromName;
      }
      if (!pcode || points <= 0) continue;

      profileTotals[pcode] = (profileTotals[pcode] || 0) + points;

      const f = codeToFreq.get(pcode) || profileCodeToFreq(pcode);
      if (f) freqTotals[f] += points;
    }

    // Persist submission snapshot (keep wrapper test_id for org reporting)
    const totals = {
      frequencies: { A: freqTotals.A, B: freqTotals.B, C: freqTotals.C, D: freqTotals.D },
      profiles: profileTotals,
      meta: {
        wrapper_test_id: taker.test_id,
        effective_test_id: effectiveTestId,
        effective_resolved_by: resolvedBy,
      },
    };

    const { error: subErr } = await sb.from("test_submissions").insert({
      taker_id: taker.id,
      test_id: taker.test_id, // wrapper
      link_token: token,
      totals,
      answers_json: answers,
      raw_answers: answers,
      first_name: taker.first_name ?? null,
      last_name: taker.last_name ?? null,
      email: taker.email ?? null,
      company: taker.company ?? null,
      role_title: taker.role_title ?? null,
    });

    if (subErr) {
      return NextResponse.json({ ok: false, error: `Submission insert failed: ${subErr.message}` }, { status: 500 });
    }

    const { error: upErr } = await sb
      .from("test_results")
      .upsert({ taker_id: taker.id, totals }, { onConflict: "taker_id" });

    if (upErr) {
      return NextResponse.json({ ok: false, error: `Results upsert failed: ${upErr.message}` }, { status: 500 });
    }

    // ---------------- QSC SCORING ----------------
    if (isQscTest) {
      try {
        const questionsForScoring = (questions || []).map((q: any) => ({
          id: q.id as string,
          idx: (q.idx as number | null) ?? null,
          profile_map: (q.profile_map ?? []) as any,
        }));

        const answersForScoring = answers
          .map((row: any) => {
            const qid = row?.question_id || row?.qid || row?.id;
            const sel = toZeroBasedSelected(row);
            return { question_id: qid as string, choice: sel ?? -1 };
          })
          .filter((a: any) => a.question_id && a.choice >= 0);

        const scoring = calculateQscScores(questionsForScoring, answersForScoring);

        let qscProfileId: string | null = null;

        if (scoring.combinedProfileCode) {
          const [personalityKey, mindsetKey] = scoring.combinedProfileCode.split("_");

          const personalityMap: Record<string, string> = { FIRE: "A", FLOW: "B", FORM: "C", FIELD: "D" };
          const mindsetMap: Record<string, number> = { ORIGIN: 1, MOMENTUM: 2, VECTOR: 3, ORBIT: 4, QUANTUM: 5 };

          const personality_code = personalityMap[personalityKey];
          const mindset_level = mindsetMap[mindsetKey];

          if (personality_code && mindset_level) {
            const { data: qscProfileRow, error: qscProfileError } = await sb
              .from("qsc_profiles")
              .select("id")
              .eq("personality_code", personality_code)
              .eq("mindset_level", mindset_level)
              .maybeSingle();

            if (!qscProfileError) qscProfileId = qscProfileRow?.id ?? null;
          }
        }

        // IMPORTANT:
        // - test_id stays wrapper for org reporting
        // - content_test_id stores canonical test for loading templates/sections/personas (global fix)
        const { error: qscUpsertError } = await sb
          .from("qsc_results")
          .upsert(
            {
              taker_id: taker.id,
              test_id: taker.test_id, // wrapper
              content_test_id: effectiveTestId, // <- requires column on portal.qsc_results
              token,
              audience: qscAudience,
              personality_totals: scoring.personalityTotals,
              personality_percentages: scoring.personalityPercentages,
              mindset_totals: scoring.mindsetTotals,
              mindset_percentages: scoring.mindsetPercentages,
              primary_personality: scoring.primaryPersonality,
              secondary_personality: scoring.secondaryPersonality,
              primary_mindset: scoring.primaryMindset,
              secondary_mindset: scoring.secondaryMindset,
              combined_profile_code: scoring.combinedProfileCode,
              qsc_profile_id: qscProfileId,
            },
            { onConflict: "taker_id" }
          );

        if (qscUpsertError) {
          console.error("QSC scoring: failed to upsert qsc_results", qscUpsertError);
        }
      } catch (e) {
        console.error("QSC scoring: unexpected error", e);
      }
    }
    // ---------------- END QSC SCORING ----------------

    // Mark completed
    await sb
      .from("test_takers")
      .update({ status: "completed" })
      .eq("id", taker.id)
      .eq("link_token", token);

    // Redirect URL (keep your existing behavior)
    let redirectUrl: string | null = null;
    if (isQscEntrepreneur && taker.link_token) {
      redirectUrl = `/qsc/${encodeURIComponent(taker.link_token)}/report?tid=${encodeURIComponent(taker.id)}`;
    }

    // Owner notification
    let ownerNotification: any = null;
    try {
      const origin = new URL(req.url).origin;

      const { data: org, error: orgErr } = await sb
        .from("orgs")
        .select("id, slug, name, notification_email, website_url")
        .eq("id", taker.org_id)
        .maybeSingle();

      if (!(orgErr || !org)) {
        const sentTo = normalizeEmail(org.notification_email) || getDefaultInternalEmail();

        const firstName = taker.first_name || "";
        const lastName = taker.last_name || "";
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

        const internalReportLink = `${origin}/portal/${org.slug}/database/${taker.id}`;
        const internalResultsDashboardLink = `${origin}/portal/${org.slug}/dashboard?testId=${taker.test_id}`;

        ownerNotification = await sendTemplatedEmail({
          orgId: org.id,
          type: "test_owner_notification",
          to: sentTo,
          context: {
            owner_first_name: "",
            owner_full_name: "",
            test_taker_full_name: fullName || taker.email || "",
            test_taker_email: taker.email || "",
            test_taker_mobile: taker.phone || "",
            test_taker_org: taker.company || "",
            test_name: (test.name as string) || slug || "your assessment",
            internal_report_link: internalReportLink,
            internal_results_dashboard_link: internalResultsDashboardLink,
            org_name: org.name || org.slug,
            owner_website: org.website_url || "",
          },
        });

        if (!ownerNotification?.ok) {
          console.error("[submit] test_owner_notification failed", ownerNotification);
        }
      }
    } catch (e) {
      console.error("[submit] owner notification unexpected error", e);
    }

    return NextResponse.json({
      ok: true,
      totals,
      redirect: redirectUrl,
      owner_notification: ownerNotification,
      __debug: {
        wrapper_test_id: taker.test_id,
        effective_test_id: effectiveTestId,
        effective_resolved_by: resolvedBy,
        is_qsc: isQscTest,
        qsc_audience: isQscTest ? qscAudience : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}


