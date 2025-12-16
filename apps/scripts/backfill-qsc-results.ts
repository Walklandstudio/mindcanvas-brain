/* scripts/backfill-qsc-results.ts
 *
 * PURPOSE
 * - Backfill portal.qsc_results.taker_id and portal.qsc_results.audience
 * - Safe to run repeatedly (idempotent-ish)
 *
 * HOW IT WORKS
 * - Finds qsc_results rows missing taker_id OR audience
 * - Resolves taker_id via portal.test_takers where:
 *     test_takers.link_token = qsc_results.token
 *     AND test_takers.test_id = qsc_results.test_id
 *   (chooses the most recent taker)
 * - Resolves audience via portal.tests.meta.qsc_variant / variant
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: "portal" } });

type Audience = "entrepreneur" | "leader";

function normaliseAudience(raw: any): Audience | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "entrepreneur") return "entrepreneur";
  if (s === "leader" || s === "leaders") return "leader";
  return null;
}

async function resolveAudienceForTest(test_id: string): Promise<Audience | null> {
  const { data, error } = await sb
    .from("tests")
    .select("id, slug, meta")
    .eq("id", test_id)
    .maybeSingle();

  if (error || !data) return null;

  const meta: any = data.meta || {};
  // your data has both variant + qsc_variant floating around
  const v =
    meta.qsc_variant ??
    meta.variant ??
    meta.frameworkType ??
    meta.kind ??
    null;

  const fromMeta = normaliseAudience(v);
  if (fromMeta) return fromMeta;

  const slug = String(data.slug || "").toLowerCase();
  if (slug.includes("leader")) return "leader";
  if (slug.includes("entrepreneur") || slug.includes("core")) return "entrepreneur";

  return null;
}

async function resolveTakerId(test_id: string, token: string): Promise<string | null> {
  const { data, error } = await sb
    .from("test_takers")
    .select("id, created_at")
    .eq("test_id", test_id)
    .eq("link_token", token)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) return null;
  return String(data.id);
}

async function run() {
  console.log("Backfill starting…");

  // Pull a batch. Re-run if you have more than this.
  const { data: rows, error } = await sb
    .from("qsc_results")
    .select("id, test_id, token, taker_id, audience, created_at")
    .or("taker_id.is.null,audience.is.null")
    .order("created_at", { ascending: true })
    .limit(5000);

  if (error) throw error;

  const list = rows || [];
  console.log(`Found ${list.length} qsc_results rows to check`);

  let updated = 0;
  let skipped = 0;

  for (const r of list) {
    const id = String((r as any).id);
    const test_id = String((r as any).test_id);
    const token = String((r as any).token);

    const patch: any = {};

    if (!(r as any).taker_id) {
      const takerId = await resolveTakerId(test_id, token);
      if (takerId) patch.taker_id = takerId;
    }

    const aud = (r as any).audience;
    if (!aud) {
      const a = await resolveAudienceForTest(test_id);
      if (a) patch.audience = a;
    } else {
      // normalise leaders -> leader if needed
      const n = normaliseAudience(aud);
      if (n && n !== aud) patch.audience = n;
    }

    if (Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }

    const { error: upErr } = await sb.from("qsc_results").update(patch).eq("id", id);
    if (upErr) {
      console.warn("Update failed for", id, upErr.message);
      continue;
    }

    updated++;
  }

  console.log(`Backfill done. updated=${updated}, skipped=${skipped}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
