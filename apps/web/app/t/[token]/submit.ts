import type { NextApiRequest, NextApiResponse } from "next";
import { sbAdmin } from "@/lib/server/supabaseAdmin";

type ProfileMapEntry = { profile: string; points: number };
type WeightEntry = { frequency: string; points: number };

function clampChoice(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(1, Math.min(10, Math.floor(n)));
}

function asJsonArray(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, error: "method_not_allowed" });
    }

    const token = String(req.query.token || "").trim();
    if (!token) return res.status(400).json({ ok: false, error: "missing_token" });

    // Accept both numeric and text answers
    // - scored radio: number (1..N)
    // - qual radio: number (1..N)
    // - qual text: string
    const body = req.body && typeof req.body === "object" ? (req.body as any) : {};
    const answers: Record<string, any> = body.answers || {}; // qid -> number|string

    // 1) Get taker (latest for token)
    const tr = await sbAdmin
      .from("test_takers")
      .select("id, meta")
      .eq("link_token", token)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tr.error) return res.status(500).json({ ok: false, error: tr.error.message });
    if (!tr.data) return res.status(404).json({ ok: false, error: "taker_not_found" });

    const takerId = tr.data.id as string;
    const existingMeta = (tr.data.meta ?? {}) as Record<string, any>;

    const qids = Object.keys(answers);

    // 2) Fetch questions needed to compute totals & capture segmentation
    //    - profile_map for profile scoring
    //    - weights for frequency scoring + capture_key
    //    - options/type/text for qual capture
    const qs = await sbAdmin
      .from("test_questions")
      .select("id, category, type, text, options, profile_map, weights")
      .in("id", qids.length ? qids : ["00000000-0000-0000-0000-000000000000"]);

    if (qs.error) return res.status(500).json({ ok: false, error: qs.error.message });

    // 3) Store answers (numeric only, safe for unknown schema)
    //    If you later add support for text answers in test_answers,
    //    we can extend this to store text too.
    if (qids.length) {
      const numericRows = qids
        .map((qid) => {
          const choice = clampChoice(answers[qid]);
          if (!choice) return null;
          return {
            taker_id: takerId,
            question_id: qid,
            choice,
          };
        })
        .filter(Boolean) as Array<{ taker_id: string; question_id: string; choice: number }>;

      if (numericRows.length) {
        const ins = await sbAdmin.from("test_answers").insert(numericRows);
        if (ins.error) return res.status(500).json({ ok: false, error: ins.error.message });
      }
    }

    // 4) Compute totals
    const profileTotals: Record<string, number> = {};
    const freqTotals: Record<string, number> = {}; // A/B/C/D totals
    const segmentation: Record<string, any> = {};

    (qs.data || []).forEach((q: any) => {
      const raw = answers[q.id];

      // ---- QUAL / Segmentation capture ----
      if (q.category === "qual") {
        const w = q.weights && typeof q.weights === "object" ? q.weights : {};
        const captureKey = typeof w.capture_key === "string" ? w.capture_key : null;

        if (!captureKey) return;

        if (q.type === "text") {
          // Store text response
          if (typeof raw === "string" && raw.trim()) {
            segmentation[captureKey] = raw.trim();
          } else {
            segmentation[captureKey] = raw ?? null;
          }
          return;
        }

        // Assume radio-like
        const sel = clampChoice(raw);
        const opts = asJsonArray(q.options);
        segmentation[captureKey] =
          sel && opts[sel - 1] != null ? String(opts[sel - 1]) : null;

        return;
      }

      // ---- SCORED questions ----
      const sel = clampChoice(raw);
      if (!sel) return;

      // Profile scoring from profile_map (array index = choice-1)
      const pm: ProfileMapEntry[] = asJsonArray(q.profile_map) as any;
      const pEntry = pm[sel - 1];
      if (pEntry && typeof pEntry.profile === "string" && typeof pEntry.points === "number") {
        profileTotals[pEntry.profile] = (profileTotals[pEntry.profile] || 0) + pEntry.points;
      }

      // Frequency scoring from weights (array index = choice-1)
      // Expect: [{points:40, frequency:"A"}, ...]
      const wm: WeightEntry[] = asJsonArray(q.weights) as any;
      const wEntry = wm[sel - 1];
      if (
        wEntry &&
        typeof wEntry.frequency === "string" &&
        typeof wEntry.points === "number"
      ) {
        const f = wEntry.frequency.toUpperCase().trim();
        if (f) freqTotals[f] = (freqTotals[f] || 0) + wEntry.points;
      }
    });

    // 5) Persist segmentation onto taker meta
    const nextMeta = {
      ...existingMeta,
      segmentation: {
        ...(existingMeta.segmentation || {}),
        ...segmentation,
      },
    };

    const upd = await sbAdmin.from("test_takers").update({ meta: nextMeta, status: "completed" }).eq("id", takerId);
    if (upd.error) return res.status(500).json({ ok: false, error: upd.error.message });

    // 6) Store totals in test_results
    // Keep structure backwards compatible:
    // - profiles stored under their keys (PROFILE_1..PROFILE_8)
    // - frequencies stored under A/B/C/D
    const totals = { ...profileTotals, ...freqTotals };

    const upsert = await sbAdmin
      .from("test_results")
      .upsert({ taker_id: takerId, totals }, { onConflict: "taker_id" })
      .select("id")
      .maybeSingle();

    if (upsert.error) return res.status(500).json({ ok: false, error: upsert.error.message });

    return res.status(200).json({
      ok: true,
      taker_id: takerId,
      totals,
      profileTotals,
      frequencyTotals: freqTotals,
      segmentation,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "unknown_error" });
  }
}

