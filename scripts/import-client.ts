// scripts/import-client.ts
/**
 * CLI importer for clients/tests/questions from CSVs.
 *
 * Usage:
 *  SUPABASE_URL=... SUPABASE_SERVICE_ROLE=... npx tsx scripts/import-client.ts \
 *    --org ./import/org.csv --profiles ./import/profiles.csv --tests ./import/tests.csv [--questions ./import/questions.csv]
 *
 * CSV formats (headers required):
 *  org.csv:       name,slug,logo_url,brand_voice
 *  profiles.csv:  code,name,flow
 *  tests.csv:     name,slug,mode,status
 *  questions.csv: idx,text,optA,optB,optC,optD,weightsA,weightsB,weightsC,weightsD
 *
 *  weightsX may be JSON-ish and will be normalized.
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type OrgRow = { name: string; slug: string; logo_url?: string; brand_voice?: string };
type ProfileRow = { code: string; name: string; flow?: string };
type TestRow = { name: string; slug: string; mode?: string; status?: string };
type QRow = {
  idx: string;
  text: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  weightsA: string;
  weightsB: string;
  weightsC: string;
  weightsD: string;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
      out[key] = val;
    }
  }
  return out as {
    org?: string;
    profiles?: string;
    tests?: string;
    questions?: string;
    dry?: boolean;
  };
}

function csvToObjects<T extends Record<string, string>>(filePath: string): T[] {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const obj: any = {};
    headers.forEach((h, idx) => (obj[h] = (cols[idx] ?? "").trim()));
    rows.push(obj as T);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && (i === 0 || line[i - 1] !== "\\")) {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => {
    s = s.trim();
    if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).replace(/""/g, '"');
    return s;
  });
}

/** Forgiving weights parser; normalizes to Record<string, number> */
function parseWeights(raw: string, ctx: { idx: number; option: string }): Record<string, number> {
  let s = (raw || "").trim();
  if (!s) return {};
  try { return normalizeWeightsObject(JSON.parse(s), ctx); } catch {}

  if (s.startsWith("'") && s.endsWith("'")) s = s.slice(1, -1);
  if (s.includes("'")) s = s.replace(/'/g, '"');
  s = s.replace(/=/g, ":").replace(/;/g, ",");
  const hasBraces = s.trim().startsWith("{") && s.trim().endsWith("}");
  if (!hasBraces) s = `{${s}}`;
  s = s.replace(/([{,]\s*)([A-Za-z]\w*)(\s*:)/g, '$1"$2"$3');
  s = s.replace(/,(\s*})/g, "$1");

  try { return normalizeWeightsObject(JSON.parse(s), ctx); }
  catch { throw new Error(`Invalid JSON in weights for idx=${ctx.idx}, option=${ctx.option}. Received: ${raw}`); }
}
function normalizeWeightsObject(obj: any, ctx: { idx: number; option: string }): Record<string, number> {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error(`Weights must be a JSON object for idx=${ctx.idx}, option=${ctx.option}`);
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    const num = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(num)) {
      throw new Error(`Non-numeric weight for key "${k}" at idx=${ctx.idx}, option=${ctx.option}`);
    }
    out[String(k)] = num;
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const { org, profiles, tests, questions } = args;
  const dry = Boolean(args.dry);
  if (!org || !profiles || !tests) {
    console.error("Usage: tsx scripts/import-client.ts --org org.csv --profiles profiles.csv --tests tests.csv [--questions questions.csv] [--dry]");
    process.exit(1);
  }

  const orgPath = path.resolve(org);
  const profilesPath = path.resolve(profiles);
  const testsPath = path.resolve(tests);
  const questionsPath = questions ? path.resolve(questions) : undefined;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) { console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env vars."); process.exit(1); }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const orgRows = csvToObjects<OrgRow>(orgPath);
  const profRows = csvToObjects<ProfileRow>(profilesPath);
  const testRows = csvToObjects<TestRow>(testsPath);
  const qRows = questionsPath ? csvToObjects<QRow>(questionsPath) : [];

  if (orgRows.length !== 1) { console.error("org.csv must contain exactly 1 row."); process.exit(1); }
  const orgRow = orgRows[0];
  console.log("Importing org:", orgRow.name, `(${orgRow.slug})`, dry ? "[DRY RUN]" : "");
  if (dry) { console.log("Profiles:", profRows.length, "Tests:", testRows.length, "Questions:", qRows.length); process.exit(0); }

  // Org
  let orgId: string;
  {
    const { data: existing, error: selErr } = await sb.from("organizations").select("id").eq("slug", orgRow.slug).maybeSingle();
    if (selErr) throw selErr;
    if (!existing) {
      const { data, error } = await sb.from("organizations").insert({ name: orgRow.name, slug: orgRow.slug }).select("id").maybeSingle();
      if (error) throw error;
      orgId = String(data!.id);
    } else {
      orgId = String(existing.id);
      const { error } = await sb.from("organizations").update({ name: orgRow.name }).eq("id", orgId);
      if (error) throw error;
    }
  }

  // Branding
  if (orgRow.logo_url || orgRow.brand_voice) {
    const { error } = await sb.from("org_brand_settings").upsert({ org_id: orgId, logo_url: orgRow.logo_url || null, brand_voice: orgRow.brand_voice || null });
    if (error) throw error;
  }

  // Profiles
  if (profRows.length > 0) {
    const rows = profRows.map((p) => ({ org_id: orgId, code: p.code, name: p.name, flow: p.flow || null }));
    const { error } = await sb.from("org_profile_codes").upsert(rows, { onConflict: "org_id,code" });
    if (error) throw error;
  }

  // Tests
  const testIdBySlug = new Map<string, string>();
  for (const t of testRows) {
    const { data: existing, error: testSelErr } = await sb.from("org_tests").select("id").eq("org_id", orgId).eq("slug", t.slug).maybeSingle();
    if (testSelErr) throw testSelErr;

    if (!existing) {
      const { data, error } = await sb.from("org_tests")
        .insert({ org_id: orgId, name: t.name, slug: t.slug, mode: (t.mode as any) || "full", status: (t.status as any) || "active" })
        .select("id").maybeSingle();
      if (error) throw error;
      testIdBySlug.set(t.slug, String(data!.id));
    } else {
      const { data, error } = await sb.from("org_tests")
        .update({ name: t.name, mode: (t.mode as any) || "full", status: (t.status as any) || "active" })
        .eq("id", existing.id).select("id").maybeSingle();
      if (error) throw error;
      testIdBySlug.set(t.slug, String((data ?? existing).id));
    }
  }

  // Questions + Options
  if (qRows.length && testRows.length) {
    const targetSlug = testRows[0].slug;
    const testId = testIdBySlug.get(targetSlug);
    if (!testId) throw new Error(`Test not found after upsert: ${targetSlug}`);

    const { data: existingQs, error: qSelErr } = await sb.from("test_questions").select("id, idx").eq("org_id", orgId).eq("test_id", testId);
    if (qSelErr) throw qSelErr;
    const qIdByIdx = new Map<number, string>((existingQs ?? []).map((r: any) => [Number(r.idx), String(r.id)]));

    for (const r of qRows) {
      const idx = Number(r.idx);
      let qid = qIdByIdx.get(idx);

      if (!qid) {
        const { data: ins, error } = await sb.from("test_questions")
          .insert({ org_id: orgId, test_id: testId, idx, order: idx, text: r.text })
          .select("id").maybeSingle();
        if (error) throw error;
        qid = String(ins!.id);
        qIdByIdx.set(idx, qid);
      } else {
        const { error } = await sb.from("test_questions").update({ text: r.text, order: idx }).eq("id", qid);
        if (error) throw error;
      }

      const opts = [
        { code: "A", text: r.optA, weights: r.weightsA, idx: 1 },
        { code: "B", text: r.optB, weights: r.weightsB, idx: 2 },
        { code: "C", text: r.optC, weights: r.weightsC, idx: 3 },
        { code: "D", text: r.optD, weights: r.weightsD, idx: 4 },
      ] as const;

      for (const o of opts) {
        const weights = parseWeights(o.weights, { idx, option: o.code });

        const { data: existingOpt, error: optSelErr } = await sb
          .from("test_options").select("id")
          .eq("org_id", orgId).eq("question_id", qid).eq("code", o.code)
          .maybeSingle();
        if (optSelErr) throw optSelErr;

        if (!existingOpt) {
          const { error } = await sb.from("test_options").insert({
            org_id: orgId,
            question_id: qid,
            idx: o.idx,         // <— set idx
            code: o.code,
            text: o.text,
            weights,
          });
          if (error) throw error;
        } else {
          const { error } = await sb.from("test_options")
            .update({ idx: o.idx, text: o.text, weights })
            .eq("id", existingOpt.id);
          if (error) throw error;
        }
      }
    }
  }

  console.log("✅ Import complete for org:", orgRow.slug);
}

main().catch((e) => { console.error(e); process.exit(1); });
