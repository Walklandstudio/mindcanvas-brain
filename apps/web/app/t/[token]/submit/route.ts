// apps/web/app/t/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { getAdminClient } from "@/app/_lib/portal";

export const runtime = "nodejs";

// simple in-memory throttle (per Vercel instance)
const WINDOW_MS = 60_000;
const LIMIT_PER_IP = 12;
const buckets = new Map<string, { count: number; resetAt: number }>();

function throttle(ip: string) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (b.count >= LIMIT_PER_IP) return true;
  b.count += 1;
  return false;
}

function clampChoice(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(1, Math.min(10, Math.floor(n)));
}

function asArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

type ProfileMapEntry = { profile: string; points: number };
type WeightEntry = { frequency: string; points: number };

function pickTopKey(map: Record<string, number>): string | null {
  let bestK: string | null = null;
  let bestV = -Infinity;
  for (const [k, v] of Object.entries(map)) {
    if (typeof v !== "number") continue;
    if (v > bestV) {
      bestV = v;
      bestK = k;
    }
  }
  return bestK;
}

export async function POST(req: Request) {
  // grab token from URL: /t/{token}/submit
  const { pathname } = new URL(req.url);
  const parts = pathname.split("/"); // ["", "t", "{token}", "submit"]
  const token = parts[2] || "";

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0";

  if (throttle(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  const sb = await getAdminClient();

  // 1) Load link
  const { data: link, error: linkErr } = await sb
    .from("test_links")
    .select("id, org_id, test_id, token, max_uses, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (linkErr || !link) {
    return NextResponse.json({ error: "Invalid link." }, { status: 400 });
  }

  // 2) Expiry check
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Link expired." }, { status: 410 });
  }

  // 3) Uses check
  const usedRes = await sb
    .from("test_submissions")
    .select("id", { count: "exact", head: true })
    .eq("org_id", link.org_id)
    .eq("test_id", link.test_id)
    .eq("link_token", token);

  const usedCount = usedRes.count ?? 0;
  if (usedCount >= (link.max_uses ?? 1)) {
    return NextResponse.json({ error: "Link already used." }, { status: 409 });
  }

  // 4) Parse payload
  const body = await req.json().catch(() => ({}));
  const takerEmail = (body?.taker_email || "").trim();
  const takerName = (body?.taker_name || body?.name || "").trim();

  // answers: { [questionId]: 1..N } for radio, and { [questionId]: string } for text qual
  const answers: Record<string, any> = body?.answers ?? {};
  const qids = Object.keys(answers || {});

  // 5) Optional taker upsert (no GHL)
  // NOTE: keeping your existing behavior (only upsert if email).
  // Segmentation persistence will only happen when we have takerId.
  let takerId: string | null = null;
  if (takerEmail) {
    const upsert = await sb
      .from("test_takers")
      .upsert(
        [{ org_id: link.org_id, email: takerEmail, name: takerName || null }],
        { onConflict: "org_id,email" }
      )
      .select("id, meta")
      .maybeSingle();
    if (upsert.error) {
      return NextResponse.json({ error: upsert.error.message }, { status: 500 });
    }
    takerId = upsert.data?.id ?? null;
  }

  // 6) Load the question mappings for scoring + segmentation capture
  // We load by test_id (not by qids) to be robust (and to support any frontend shape),
  // but we only score the questions that are present in `answers`.
  const { data: questions, error: qErr } = await sb
    .from("test_questions")
    .select("id, category, type, options, profile_map, weights")
    .eq("test_id", link.test_id);

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  const byId = new Map<string, any>();
  (questions || []).forEach((q: any) => byId.set(q.id, q));

  const profileTotals: Record<string, number> = {};
  const driverTotals: Record<string, number> = {}; // A/B/C/D
  const segmentation: Record<string, any> = {};

  // Score only what was answered
  for (const qid of qids) {
    const q = byId.get(qid);
    if (!q) continue;

    // QUAL (segmentation) — persist using weights.capture_key
    if (q.category === "qual") {
      const wObj = q.weights && typeof q.weights === "object" ? q.weights : {};
      const captureKey = typeof wObj.capture_key === "string" ? wObj.capture_key : null;
      if (!captureKey) continue;

      const raw = answers[qid];

      if (q.type === "text") {
        // store raw text
        segmentation[captureKey] =
          typeof raw === "string" ? raw.trim() : raw ?? null;
        continue;
      }

      // assume radio-like selection
      const sel = clampChoice(raw);
      const opts = asArray<string>(q.options);
      segmentation[captureKey] =
        sel && opts[sel - 1] != null ? String(opts[sel - 1]) : null;

      continue;
    }

    // SCORED
    const sel = clampChoice(answers[qid]);
    if (!sel) continue;

    // profile_map scoring (array index = choice-1)
    const pm = asArray<ProfileMapEntry>(q.profile_map);
    const pEntry = pm[sel - 1];
    if (
      pEntry &&
      typeof pEntry.profile === "string" &&
      typeof pEntry.points === "number"
    ) {
      profileTotals[pEntry.profile] =
        (profileTotals[pEntry.profile] || 0) + pEntry.points;
    }

    // weights scoring (OperatingFrame drivers) — expects array index = choice-1
    // [{ points: 40, frequency: "A" }, ...]
    const wm = asArray<WeightEntry>(q.weights);
    const wEntry = wm[sel - 1];
    if (
      wEntry &&
      typeof wEntry.frequency === "string" &&
      typeof wEntry.points === "number"
    ) {
      const f = wEntry.frequency.toUpperCase().trim();
      if (f) driverTotals[f] = (driverTotals[f] || 0) + wEntry.points;
    }
  }

  // Compute top profile + top driver (simple max)
  const topProfile = pickTopKey(profileTotals); // e.g. PROFILE_1
  const topDriver = pickTopKey(driverTotals); // e.g. A

  // Total points: sum of all profile points (simple + consistent)
  const totalPoints = Object.values(profileTotals).reduce(
    (acc, v) => acc + (Number.isFinite(v) ? Number(v) : 0),
    0
  );

  // 7) Persist segmentation to taker meta (if we have a taker)
  if (takerId && Object.keys(segmentation).length) {
    // fetch existing meta (avoid clobber)
    const { data: takerRow, error: takerErr } = await sb
      .from("test_takers")
      .select("meta")
      .eq("id", takerId)
      .maybeSingle();

    if (!takerErr) {
      const existingMeta = (takerRow?.meta ?? {}) as Record<string, any>;
      const nextMeta = {
        ...existingMeta,
        segmentation: {
          ...(existingMeta.segmentation || {}),
          ...segmentation,
        },
      };

      await sb.from("test_takers").update({ meta: nextMeta }).eq("id", takerId);
    }
  }

  // 8) Insert submission (use server-computed totals, do NOT trust client totals)
  const ins = await sb
    .from("test_submissions")
    .insert([
      {
        org_id: link.org_id,
        test_id: link.test_id,
        link_token: token,
        taker_id: takerId,
        taker_email: takerEmail || null,
        taker_name: takerName || null,

        total_points: totalPoints || null,
        frequency: topDriver || null, // A/B/C/D
        profile: topProfile || null, // PROFILE_1..PROFILE_8

        answers, // raw answers payload
      },
    ])
    .select("id")
    .maybeSingle();

  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }

  // 9) Store canonical result URL on the test taker (if we have one)
  if (takerId) {
    const resultUrl = `/t/${encodeURIComponent(
      token
    )}/result?tid=${encodeURIComponent(takerId)}`;

    await sb.from("test_takers").update({ last_result_url: resultUrl }).eq("id", takerId);
  }

  // Return helpful debug info while you validate OperatingFrame
  return NextResponse.json({
    ok: true,
    submissionId: ins.data?.id ?? null,
    computed: {
      totalPoints,
      topProfile,
      topDriver,
      profileTotals,
      driverTotals,
      segmentation,
    },
  });
}

