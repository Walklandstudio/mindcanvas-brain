// apps/web/app/api/public/test/[token]/submit/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateQscScores } from "@/lib/qsc-scoring";
import { sendTemplatedEmail } from "@/lib/server/emailTemplates";
import { getBaseUrl } from "@/lib/baseUrl";
import { reserveSubmission } from "@/app/_lib/billing";
import {
  mapInevitableStandardSubmission,
  type InevitableStandardSubmittedAnswer,
} from "@/lib/inevitable-standard/mapSubmission";
import { deriveInevitableStandardConstraints } from "@/lib/inevitable-standard/constraintEngine";
import { calculateInevitableStandardRevenueInStructure } from "@/lib/inevitable-standard/revenueInStructure";
import { syncInevitableStandardToGhl } from "@/lib/server/ghl/inevitableStandardContact";

type AB = "A" | "B" | "C" | "D";
type AnswerCode = "A" | "B" | "C" | "D" | "E";
type Tier = "Invisible" | "Emerging" | "Established" | "Magnetic";
type Readiness = "stabilise" | "ready_to_progress";
type PrimePillar = "visibility" | "trust" | "authority" | "dominance";
type SectionCode =
  | "personality"
  | "visibility"
  | "trust"
  | "authority"
  | "dominance";

type PMEntry = { points?: number; profile?: string };

type RhythmDriver =
  | "resourceful"
  | "human_centred"
  | "yielding"
  | "tactical"
  | "hopeful"
  | "measured";

type RhythmDriverEntry = {
  driver?: string;
};

type PortalQuestionRow = {
  id: string;
  idx?: number | string | null;
  text?: string | null;
  category?: string | null;
  type?: string | null;
  options?: any | null;
  profile_map?: any | null;
  weights?: any | null;
};

type VisQuestionRow = {
  id: string;
  idx: number;
  code: string;
  text?: string | null;
  pillar: number;
  section_code: SectionCode | null;
  is_internal_only: boolean;
  is_scored: boolean;
};

type VisOptionRow = {
  question_id: string;
  option_code: string;
  scoring: VisScoring;
  is_active: boolean;
  label?: string | null;
  text?: string | null;
  option_text?: string | null;
  option_label?: string | null;
  answer_text?: string | null;
  display_text?: string | null;
  title?: string | null;
  name?: string | null;
  value?: string | null;
  content?: string | null;
  copy?: string | null;
};

type ScoringPersonality = {
  type: "personality";
  bucket: AB;
  points: number;
};

type ScoringTier = {
  type: "tier";
  tier: Tier;
};

type ScoringPrime = {
  type: "prime";
  value?: number;
  pillar?: PrimePillar;
  tier_weights?: Partial<Record<Tier, number>>;
};

type VisScoring = ScoringPersonality | ScoringTier | ScoringPrime;

type GedDiagnosticKey =
  | "business_stage"
  | "core_constraint"
  | "scale_readiness"
  | "self_diagnosis";

type GedChoiceAnswer = {
  question_id: string;
  question_text: string | null;
  value: string | null;
  label: string | null;
};

type GedDiagnostics = {
  business_stage: GedChoiceAnswer | null;
  core_constraint: GedChoiceAnswer | null;
  scale_readiness: GedChoiceAnswer | null;
  self_diagnosis: string | null;
};

type QscResultSummary = {
  audience: "entrepreneur" | "leader";
  personality_layer: string | null;
  mindset_layer: string | null;
  quantum_profile: string | null;
  primary_personality_raw: string | null;
  primary_mindset_raw: string | null;
  combined_profile_code_raw: string | null;
};

type GhlSyncResult = {
  ok: boolean;
  skipped?: boolean;
  message?: string;
  status?: number;
  response?: any;
};

type CompetencyCoachSyncMode = "qsc_entrepreneur" | "cc_dna_blueprint";

const TIERS: Tier[] = ["Invisible", "Emerging", "Established", "Magnetic"];
const PRIME_PILLARS: PrimePillar[] = [
  "visibility",
  "trust",
  "authority",
  "dominance",
];

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "portal" } });
}

function visSupa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_ANON_KEY!;
  return createClient(url, key, { db: { schema: "visibility" } });
}

function isUuidLike(s: string) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(
    String(s || "").trim()
  );
}

function normalizeSlug(s: any) {
  return String(s || "").trim().toLowerCase();
}

function normalizeText(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseMaybeJson<T = any>(value: any): T | null {
  if (value == null) return null;
  if (Array.isArray(value) || typeof value === "object") return value as T;
  if (typeof value !== "string") return null;

  const s = value.trim();
  if (!s) return null;
  if (!(s.startsWith("{") || s.startsWith("["))) return null;

  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function coerceProfileMapEntries(value: any): PMEntry[] {
  const direct = parseMaybeJson<any>(value);
  const arr = Array.isArray(direct)
    ? direct
    : Array.isArray((direct as any)?.profile_map)
      ? (direct as any).profile_map
      : Array.isArray((direct as any)?.weights)
        ? (direct as any).weights
        : Array.isArray((direct as any)?.map)
          ? (direct as any).map
          : [];

  return arr
    .map((entry: any) => ({
      points: Number(entry?.points ?? 0),
      profile: String(entry?.profile || "").trim(),
    }))
    .filter(
      (entry: PMEntry) =>
        Number.isFinite(Number(entry.points)) && !!entry.profile
    );
}

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

  if (typeof row?.value === "string" && row.value.trim() !== "") {
    const n = Number(row.value);
    if (Number.isFinite(n)) {
      const sel = n - 1;
      return sel >= 0 ? sel : null;
    }
  }

  if (typeof row?.index === "number") return row.index;
  if (typeof row?.selected === "number") return row.selected;
  if (typeof row?.selected_index === "number") return row.selected_index;

  if (typeof row?.index === "string" && row.index.trim() !== "") {
    const n = Number(row.index);
    if (Number.isFinite(n)) return n;
  }

  if (typeof row?.selected === "string" && row.selected.trim() !== "") {
    const n = Number(row.selected);
    if (Number.isFinite(n)) return n;
  }

  if (
    typeof row?.selected_index === "string" &&
    row.selected_index.trim() !== ""
  ) {
    const n = Number(row.selected_index);
    if (Number.isFinite(n)) return n;
  }

  if (row?.value && typeof row.value.index === "number") return row.value.index;
  return null;
}

const RHYTHM_DRIVERS: RhythmDriver[] = [
  "resourceful",
  "human_centred",
  "yielding",
  "tactical",
  "hopeful",
  "measured",
];

function isRhythmDriver(value: any): value is RhythmDriver {
  return RHYTHM_DRIVERS.includes(String(value || "") as RhythmDriver);
}

function coerceRhythmDriverEntries(value: any): { driver: RhythmDriver }[] {
  const direct = parseMaybeJson<any>(value);

  const arr = Array.isArray(direct)
    ? direct
    : Array.isArray((direct as any)?.drivers)
      ? (direct as any).drivers
      : [];

  return arr
    .map((entry: RhythmDriverEntry) => ({
      driver: String(entry?.driver || "").trim(),
    }))
    .filter((entry: { driver: string }) => isRhythmDriver(entry.driver))
    .map((entry: { driver: string }) => ({
      driver: entry.driver as RhythmDriver,
    }));
}

function scoreRhythmLayer(args: {
  rhythmQuestions: PortalQuestionRow[];
  answers: any[];
}) {
  const { rhythmQuestions, answers } = args;

  const rawScores: Record<RhythmDriver, number> = {
    resourceful: 0,
    human_centred: 0,
    yielding: 0,
    tactical: 0,
    hopeful: 0,
    measured: 0,
  };

  const answersSnapshot: Record<string, any> = {};
  const rhythmQuestionIds = new Set(
    rhythmQuestions.map((q) => String(q.id))
  );

  const questionById = new Map<string, PortalQuestionRow>();
  for (const q of rhythmQuestions) {
    questionById.set(String(q.id), q);
  }

  let answeredRhythmQuestions = 0;

  for (const row of answers || []) {
    const qid = String(row?.question_id || row?.qid || row?.id || "").trim();
    if (!qid || !rhythmQuestionIds.has(qid)) continue;

    const q = questionById.get(qid);
    if (!q) continue;

    const driverEntries = coerceRhythmDriverEntries(q.profile_map);
    if (!driverEntries.length) continue;

    const selectedIndex = toZeroBasedSelected(row);
    if (
      selectedIndex == null ||
      selectedIndex < 0 ||
      selectedIndex >= driverEntries.length
    ) {
      continue;
    }

    const driver = driverEntries[selectedIndex]?.driver;
    if (!isRhythmDriver(driver)) continue;

    rawScores[driver] += 1;
    answeredRhythmQuestions += 1;

    answersSnapshot[String(q.idx ?? qid)] = {
      question_id: qid,
      idx: q.idx ?? null,
      question_text: q.text ?? null,
      selected_index: selectedIndex,
      driver,
    };
  }

  const denominator = rhythmQuestions.length || 17;

  const percentages = Object.fromEntries(
    RHYTHM_DRIVERS.map((driver) => [
      driver,
      Number(((rawScores[driver] / denominator) * 100).toFixed(1)),
    ])
  ) as Record<RhythmDriver, number>;

  const rankedDrivers = [...RHYTHM_DRIVERS].sort((a, b) => {
    const scoreDiff = rawScores[b] - rawScores[a];
    if (scoreDiff !== 0) return scoreDiff;
    return RHYTHM_DRIVERS.indexOf(a) - RHYTHM_DRIVERS.indexOf(b);
  });

  return {
    rawScores,
    percentages,
    rankedDrivers,
    flowDrivers: rankedDrivers.slice(0, 2),
    stabilisingDrivers: rankedDrivers.slice(2, 4),
    frustrationDrivers: rankedDrivers.slice(4, 6),
    primaryDriver: rankedDrivers[0] ?? null,
    secondaryDriver: rankedDrivers[1] ?? null,
    answersSnapshot,
    answeredRhythmQuestions,
    rhythmQuestionCount: rhythmQuestions.length,
  };
}

const asNumber = (x: any, d = 0) =>
  Number.isFinite(Number(x)) ? Number(x) : d;

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

function getDefaultSupportEmail() {
  return (
    normalizeEmail(process.env.INTERNAL_NOTIFICATIONS_EMAIL) ||
    "support@profiletest.ai"
  );
}

/* ---------------- GED helpers ---------------- */

function titleCaseWord(word: string) {
  const s = normalizeText(word).toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function formatQscDisplay(value: any): string | null {
  const raw = normalizeText(value);
  if (!raw) return null;
  return raw
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ");
}

function getQuestionOptions(q: PortalQuestionRow): any[] {
  if (Array.isArray(q.options)) return q.options;
  const parsed = parseMaybeJson<any>(q.options);
  return Array.isArray(parsed) ? parsed : [];
}

function getTextAnswerValue(row: any): string | null {
  const candidates = [
    row?.text,
    row?.answer,
    row?.free_text,
    row?.freeText,
    row?.response,
    row?.input,
    row?.value,
    row?.selected_text,
    row?.selectedText,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (!trimmed) continue;
      const n = Number(trimmed);
      if (Number.isFinite(n) && String(n) === trimmed) continue;
      return trimmed;
    }
  }

  return null;
}

function getSelectedOptionInfo(
  q: PortalQuestionRow,
  row: any
): { value: string | null; label: string | null } | null {
  const sel = toZeroBasedSelected(row);
  if (sel == null || sel < 0) return null;

  const options = getQuestionOptions(q);
  const opt = options[sel];
  if (opt == null) return null;

  if (typeof opt === "string" || typeof opt === "number") {
    const s = String(opt).trim();
    return { value: s || null, label: s || null };
  }

  if (typeof opt === "object") {
    const value =
      normalizeText(opt.value) ||
      normalizeText(opt.code) ||
      normalizeText(opt.key) ||
      normalizeText(opt.id) ||
      normalizeText(opt.slug) ||
      normalizeText(opt.label) ||
      normalizeText(opt.text) ||
      normalizeText(opt.title) ||
      null;

    const label =
      normalizeText(opt.label) ||
      normalizeText(opt.text) ||
      normalizeText(opt.title) ||
      normalizeText(opt.name) ||
      normalizeText(opt.value) ||
      normalizeText(opt.code) ||
      null;

    return { value, label };
  }

  return null;
}

function getGedDiagnosticKey(q: PortalQuestionRow): GedDiagnosticKey | null {
  const text = normalizeText(q.text).toLowerCase();

  if (text === "which best describes your current business?") {
    return "business_stage";
  }

  if (text === "where is your biggest constraint right now?") {
    return "core_constraint";
  }

  if (text === "if you stepped out of the business for 30 days, what would happen?") {
    return "scale_readiness";
  }

  if (
    text ===
    "in your own words, what is currently stopping your business from scaling without you?"
  ) {
    return "self_diagnosis";
  }

  return null;
}

function extractGedDiagnostics(
  questionRows: PortalQuestionRow[],
  answerRows: any[]
): GedDiagnostics {
  const byId = new Map<string, PortalQuestionRow>();
  for (const q of questionRows || []) {
    byId.set(String(q.id), q);
  }

  const diagnostics: GedDiagnostics = {
    business_stage: null,
    core_constraint: null,
    scale_readiness: null,
    self_diagnosis: null,
  };

  for (const row of answerRows || []) {
    const qid = String(row?.question_id || row?.qid || row?.id || "").trim();
    if (!qid) continue;

    const q = byId.get(qid);
    if (!q) continue;

    const key = getGedDiagnosticKey(q);
    if (!key) continue;

    if (key === "self_diagnosis") {
      diagnostics.self_diagnosis = getTextAnswerValue(row);
      continue;
    }

    const selected = getSelectedOptionInfo(q, row);
    diagnostics[key] = {
      question_id: qid,
      question_text: normalizeText(q.text) || null,
      value: selected?.value ?? null,
      label: selected?.label ?? null,
    };
  }

  return diagnostics;
}

function hasGedDiagnostics(diagnostics: GedDiagnostics) {
  return Boolean(
    diagnostics.business_stage ||
      diagnostics.core_constraint ||
      diagnostics.scale_readiness ||
      diagnostics.self_diagnosis
  );
}

function pushCustomField(
  customFields: any[],
  identifier: string | undefined,
  value: any
) {
  const fieldValue =
    typeof value === "string"
      ? value.trim()
      : value == null
        ? ""
        : String(value).trim();

  if (!identifier || !identifier.trim() || !fieldValue) return;

  const token = identifier.trim();

  if (token.startsWith("key:")) {
    const key = token.slice(4).trim();
    if (!key) return;
    customFields.push({ key, value: fieldValue, field_value: fieldValue });
    return;
  }

  if (token.startsWith("id:")) {
    const id = token.slice(3).trim();
    if (!id) return;
    customFields.push({ id, value: fieldValue, field_value: fieldValue });
    return;
  }

  customFields.push({ id: token, value: fieldValue, field_value: fieldValue });
}


function pushHighLevelCustomField(
  customFields: any[],
  identifier: string | undefined,
  value: any
) {
  if (!identifier || !identifier.trim() || value == null) return;

  let fieldValue: any = value;

  if (Array.isArray(fieldValue)) {
    fieldValue = fieldValue
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .join(", ");
  } else if (typeof fieldValue === "string") {
    fieldValue = fieldValue.trim();
  } else if (typeof fieldValue === "boolean") {
    fieldValue = fieldValue ? "true" : "false";
  }

  if (fieldValue === "") return;

  const token = identifier.trim();

  if (token.startsWith("key:")) {
    const key = token.slice(4).trim();
    if (!key) return;
    customFields.push({ key, fieldValue });
    return;
  }

  if (token.startsWith("id:")) {
    const id = token.slice(3).trim();
    if (!id) return;
    customFields.push({ id, fieldValue });
    return;
  }

  customFields.push({ id: token, fieldValue });
}

function getVisibilityOptionDisplayText(option: VisOptionRow): string | null {
  const raw: any = option as any;
  const candidates = [
    raw.option_text,
    raw.option_label,
    raw.answer_text,
    raw.display_text,
    raw.label,
    raw.text,
    raw.title,
    raw.name,
    raw.value,
    raw.content,
    raw.copy,
    raw?.scoring?.label,
    raw?.scoring?.text,
  ];

  for (const candidate of candidates) {
    const value = normalizeText(candidate);
    if (value) return value;
  }

  return null;
}

function getVisibilityPersonalityQuestionNumber(
  question: VisQuestionRow
): number | null {
  const code = normalizeText(question.code).toUpperCase();
  const codeMatch = code.match(/^(?:P|Q)([1-8])$/);

  if (codeMatch) {
    return Number(codeMatch[1]);
  }

  if (
    question.section_code === "personality" &&
    Number.isFinite(question.idx) &&
    question.idx >= 1 &&
    question.idx <= 8
  ) {
    return question.idx;
  }

  return null;
}

function formatVisibilityLabel(value: any): string | null {
  const raw = normalizeText(value);
  if (!raw) return null;

  return raw
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ");
}

async function syncVisibilityLadderToGhl(args: {
  taker: any;
  assessmentName: string;
  assessmentId: string;
  reportUrl: string;
  completedAt: string;
  personalityType: AB | null;
  personalityPercent: Record<AB, number>;
  personalityAnswers: Record<number, string>;
  tier: Tier;
  level: number;
  readiness: Readiness;
  pillarScores: Record<string, number>;
  overallPct: number | null;
  strongestPillar: string | null;
  weakestPillar: string | null;
  balancePattern: string | null;
  patternTags: string[];
}): Promise<GhlSyncResult> {
  const serviceBase =
    normalizeText(process.env.WHATSWHAT_GHL_SERVICE_BASE_URL) ||
    "https://services.leadconnectorhq.com";

  const endpoint =
    normalizeText(process.env.WHATSWHAT_GHL_CONTACT_UPSERT_URL) ||
    `${serviceBase}/contacts/upsert`;

  const apiKey = normalizeText(process.env.WHATSWHAT_GHL_API_KEY);
  const locationId = normalizeText(process.env.WHATSWHAT_GHL_LOCATION_ID);
  const apiVersion =
    normalizeText(process.env.WHATSWHAT_GHL_API_VERSION) ||
    normalizeText(process.env.GHL_API_VERSION) ||
    "2021-07-28";

  if (!apiKey || !locationId || !endpoint) {
    return {
      ok: false,
      skipped: true,
      message:
        "Skipped Visibility Ladder GHL sync because the API key, Location ID, or endpoint is missing.",
    };
  }

  const email = normalizeEmail(args.taker?.email);
  const phone = normalizeText(args.taker?.phone);

  if (!email && !phone) {
    return {
      ok: false,
      skipped: true,
      message:
        "Skipped Visibility Ladder GHL sync because the taker has neither email nor phone.",
    };
  }

  const customFields: any[] = [];

  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_INDUSTRY,
    args.taker?.industry
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_ROLE_OR_DEPARTMENT,
    args.taker?.role_title
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_LINKEDIN_PROFILE,
    args.taker?.linkedin_profile
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_REFERRED_BY,
    args.taker?.referred_by
  );

  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_PERSONALITY_TYPE,
    args.personalityType
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_PERSONALITY_A_PERCENTAGE,
    args.personalityPercent.A
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_PERSONALITY_B_PERCENTAGE,
    args.personalityPercent.B
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_PERSONALITY_C_PERCENTAGE,
    args.personalityPercent.C
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_PERSONALITY_D_PERCENTAGE,
    args.personalityPercent.D
  );

  const questionFieldIds = [
    process.env.WHATSWHAT_GHL_VL_CF_Q1_ANSWER,
    process.env.WHATSWHAT_GHL_VL_CF_Q2_ANSWER,
    process.env.WHATSWHAT_GHL_VL_CF_Q3_ANSWER,
    process.env.WHATSWHAT_GHL_VL_CF_Q4_ANSWER,
    process.env.WHATSWHAT_GHL_VL_CF_Q5_ANSWER,
    process.env.WHATSWHAT_GHL_VL_CF_Q6_ANSWER,
    process.env.WHATSWHAT_GHL_VL_CF_Q7_ANSWER,
    process.env.WHATSWHAT_GHL_VL_CF_Q8_ANSWER,
  ];

  for (let questionNumber = 1; questionNumber <= 8; questionNumber += 1) {
    pushHighLevelCustomField(
      customFields,
      questionFieldIds[questionNumber - 1],
      args.personalityAnswers[questionNumber]
    );
  }

  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_VISIBILITY_TIER,
    args.tier
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_VISIBILITY_LEVEL,
    args.level
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_READINESS,
    formatVisibilityLabel(args.readiness)
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_VISIBILITY_SCORE,
    args.pillarScores.visibility
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_TRUST_SCORE,
    args.pillarScores.trust
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_AUTHORITY_SCORE,
    args.pillarScores.authority
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_DOMINANCE_SCORE,
    args.pillarScores.dominance
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_OVERALL_VISIBILITY_SCORE,
    args.overallPct
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_STRONGEST_PILLAR,
    formatVisibilityLabel(args.strongestPillar)
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_WEAKEST_PILLAR,
    formatVisibilityLabel(args.weakestPillar)
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_BALANCE_PATTERN,
    formatVisibilityLabel(args.balancePattern)
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_PATTERN_TAGS,
    args.patternTags
  );

  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_ASSESSMENT_NAME,
    args.assessmentName
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_ASSESSMENT_ID,
    args.assessmentId
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_REPORT_URL,
    args.reportUrl
  );
  pushHighLevelCustomField(
    customFields,
    process.env.WHATSWHAT_GHL_VL_CF_COMPLETED_AT,
    args.completedAt
  );

  const fullName = [args.taker?.first_name, args.taker?.last_name]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ")
    .trim();

  const payload: any = {
    locationId,
    firstName: normalizeText(args.taker?.first_name) || undefined,
    lastName: normalizeText(args.taker?.last_name) || undefined,
    name: fullName || undefined,
    email: email || undefined,
    phone: phone || undefined,
    source: "MindCanvas Visibility Ladder",
    customFields: customFields.length ? customFields : undefined,
  };

  if (normalizeText(args.taker?.company)) {
    payload.companyName = normalizeText(args.taker.company);
  }

  if (normalizeText(args.taker?.website_url)) {
    payload.website = normalizeText(args.taker.website_url);
  }

  const countryCode = normalizeText(args.taker?.country_code).toUpperCase();
  if (/^[A-Z]{2}$/.test(countryCode)) {
    payload.country = countryCode;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: apiVersion,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const raw = await response.text();
    let parsed: any = raw;

    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // Keep the raw response text for diagnostics.
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: `Visibility Ladder GHL upsert failed with status ${response.status}`,
        response: parsed,
      };
    }

    const contactId = normalizeText(
      parsed?.contact?.id || parsed?.contactId || parsed?.id
    );

    const completionTag =
      normalizeText(process.env.WHATSWHAT_GHL_VL_TAG_COMPLETED) ||
      "VL_completed_assessment";

    if (completionTag && contactId) {
      const tagResponse = await fetch(
        `${serviceBase}/contacts/${encodeURIComponent(contactId)}/tags`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Version: apiVersion,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tags: [completionTag] }),
          cache: "no-store",
        }
      );

      const tagRaw = await tagResponse.text();
      let tagParsed: any = tagRaw;

      try {
        tagParsed = tagRaw ? JSON.parse(tagRaw) : null;
      } catch {
        // Keep the raw response text for diagnostics.
      }

      if (!tagResponse.ok) {
        return {
          ok: false,
          status: tagResponse.status,
          message: `Visibility Ladder contact synced, but adding the completion tag failed with status ${tagResponse.status}`,
          response: {
            upsert: parsed,
            tags: tagParsed,
          },
        };
      }

      return {
        ok: true,
        status: response.status,
        response: {
          upsert: parsed,
          tags: tagParsed,
        },
      };
    }

    if (completionTag && !contactId) {
      return {
        ok: false,
        status: response.status,
        message:
          "Visibility Ladder contact synced, but the GHL response did not include a contact ID, so the completion tag could not be added.",
        response: parsed,
      };
    }

    return {
      ok: true,
      status: response.status,
      response: parsed,
    };
  } catch (e: any) {
    return {
      ok: false,
      message: `Visibility Ladder GHL request failed: ${String(
        e?.message || e
      )}`,
    };
  }
}

async function syncGedToGhl(args: {
  taker: any;
  token: string;
  testName: string;
  orgId: string;
  reportUrl: string;
  resultUrl: string;
  qscSummary: QscResultSummary | null;
  gedDiagnostics: GedDiagnostics;
}): Promise<GhlSyncResult> {
  const endpoint =
    normalizeText(process.env.GHL_CONTACT_UPSERT_URL) ||
    "https://services.leadconnectorhq.com/contacts/upsert";

  const apiKey = normalizeText(process.env.GHL_API_KEY);
  const locationId = normalizeText(process.env.GHL_LOCATION_ID);
  const apiVersion =
    normalizeText(process.env.GHL_API_VERSION) || "2021-07-28";

  if (!apiKey || !locationId || !endpoint) {
    return {
      ok: false,
      skipped: true,
      message:
        "Skipped GHL sync because GHL_CONTACT_UPSERT_URL, GHL_API_KEY, or GHL_LOCATION_ID is missing.",
    };
  }

  const email = normalizeEmail(args.taker?.email);
  const phone = normalizeText(args.taker?.phone);

  if (!email && !phone) {
    return {
      ok: false,
      skipped: true,
      message: "Skipped GHL sync because taker has neither email nor phone.",
    };
  }

  const customFields: any[] = [];

  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_PERSONALITY_LAYER,
    args.qscSummary?.personality_layer
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_MINDSET_LAYER,
    args.qscSummary?.mindset_layer
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_QUANTUM_PROFILE,
    args.qscSummary?.quantum_profile
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_BUSINESS_STAGE,
    args.gedDiagnostics.business_stage?.label ||
      args.gedDiagnostics.business_stage?.value
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_CORE_CONSTRAINT,
    args.gedDiagnostics.core_constraint?.label ||
      args.gedDiagnostics.core_constraint?.value
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_SCALE_READINESS,
    args.gedDiagnostics.scale_readiness?.label ||
      args.gedDiagnostics.scale_readiness?.value
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_SELF_DIAGNOSIS,
    args.gedDiagnostics.self_diagnosis
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_REPORT_URL,
    args.reportUrl
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_RESULT_URL,
    args.resultUrl
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_ASSESSMENT_NAME,
    args.testName
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_TOKEN,
    args.token
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_ORG_ID,
    args.orgId
  );
  pushCustomField(
    customFields,
    process.env.GHL_CF_GED_COMPLETED_AT,
    new Date().toISOString()
  );

  const completionTag =
    normalizeText(process.env.GHL_TAG_GED_COMPLETED_ASSESSMENT) ||
    "GED_completed_assessment";

  const tags = [completionTag].filter(Boolean);

  const fullName = [args.taker?.first_name, args.taker?.last_name]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ")
    .trim();

  const payload: any = {
    locationId,
    firstName: normalizeText(args.taker?.first_name) || undefined,
    lastName: normalizeText(args.taker?.last_name) || undefined,
    name: fullName || undefined,
    email: email || undefined,
    phone: phone || undefined,
    tags,
    customFields: customFields.length ? customFields : undefined,
  };

  if (normalizeText(args.taker?.company)) {
    payload.companyName = normalizeText(args.taker?.company);
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: apiVersion,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const raw = await res.text();
    let parsed: any = raw;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // keep raw text
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: `GHL sync failed with status ${res.status}`,
        response: parsed,
      };
    }

    return {
      ok: true,
      status: res.status,
      response: parsed,
    };
  } catch (e: any) {
    return {
      ok: false,
      message: `GHL sync request failed: ${String(e?.message || e)}`,
    };
  }
}

async function syncCompetencyCoachToGhl(args: {
  mode: CompetencyCoachSyncMode;
  taker: any;
  reportUrl: string;
  qscSummary: QscResultSummary | null;
  ccProfile: string | null;
  ccCoachingFlow: string | null;
}): Promise<GhlSyncResult> {
  const endpoint =
    normalizeText(process.env.COMPETENCY_COACH_GHL_CONTACT_UPSERT_URL) ||
    normalizeText(process.env.GHL_CONTACT_UPSERT_URL) ||
    "https://services.leadconnectorhq.com/contacts/upsert";

  const apiKey = normalizeText(process.env.COMPETENCY_COACH_GHL_API_KEY);
  const locationId = normalizeText(process.env.COMPETENCY_COACH_GHL_LOCATION_ID);
  const apiVersion =
    normalizeText(process.env.COMPETENCY_COACH_GHL_API_VERSION) ||
    normalizeText(process.env.GHL_API_VERSION) ||
    "2021-07-28";

  if (!apiKey || !locationId || !endpoint) {
    return {
      ok: false,
      skipped: true,
      message:
        "Skipped Competency Coach GHL sync because location, API key, or endpoint is missing.",
    };
  }

  const email = normalizeEmail(args.taker?.email);
  const phone = normalizeText(args.taker?.phone);

  if (!email && !phone) {
    return {
      ok: false,
      skipped: true,
      message:
        "Skipped Competency Coach GHL sync because taker has neither email nor phone.",
    };
  }

  const customFields: any[] = [];
  let completionTag = "";

  if (args.mode === "qsc_entrepreneur") {
    if (!args.qscSummary) {
      return {
        ok: false,
        skipped: true,
        message:
          "Skipped Competency Coach QSC sync because QSC summary was not available.",
      };
    }

    pushCustomField(
      customFields,
      process.env.COMPETENCY_COACH_GHL_CF_QSC_PROFILE ||
        "key:contact.qsc_profile",
      args.qscSummary.quantum_profile
    );

    pushCustomField(
      customFields,
      process.env.COMPETENCY_COACH_GHL_CF_QSC_MINDSET_LEVEL ||
        "key:contact.qsc_mindset_level",
      args.qscSummary.mindset_layer
    );

    pushCustomField(
      customFields,
      process.env.COMPETENCY_COACH_GHL_CF_QSC_REPORT_URL ||
        "key:contact.qsc_prospect_report_link",
      args.reportUrl
    );

    completionTag =
      normalizeText(process.env.COMPETENCY_COACH_GHL_TAG_QSC_COMPLETED) ||
      "QSC Completed";
  }

  if (args.mode === "cc_dna_blueprint") {
    pushCustomField(
      customFields,
      process.env.COMPETENCY_COACH_GHL_CF_CC_PROFILE ||
        "key:contact.cc_profile",
      args.ccProfile
    );

    pushCustomField(
      customFields,
      process.env.COMPETENCY_COACH_GHL_CF_CC_COACHING_FLOW ||
        "key:contact.cc_coaching_flow",
      args.ccCoachingFlow
    );

    pushCustomField(
      customFields,
      process.env.COMPETENCY_COACH_GHL_CF_CC_REPORT_URL ||
        "key:contact.cc_prospect_report_link",
      args.reportUrl
    );

    completionTag =
      normalizeText(process.env.COMPETENCY_COACH_GHL_TAG_CC_COMPLETED) ||
      "CC DNA Blueprint Completed";
  }

  const tags = completionTag ? [completionTag] : [];

  const fullName = [args.taker?.first_name, args.taker?.last_name]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ")
    .trim();

  const payload: any = {
    locationId,
    firstName: normalizeText(args.taker?.first_name) || undefined,
    lastName: normalizeText(args.taker?.last_name) || undefined,
    name: fullName || undefined,
    email: email || undefined,
    phone: phone || undefined,
    tags,
    customFields: customFields.length ? customFields : undefined,
  };

  if (normalizeText(args.taker?.company)) {
    payload.companyName = normalizeText(args.taker?.company);
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: apiVersion,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const raw = await res.text();
    let parsed: any = raw;

    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // keep raw text
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: `Competency Coach GHL sync failed with status ${res.status}`,
        response: parsed,
      };
    }

    return {
      ok: true,
      status: res.status,
      response: parsed,
    };
  } catch (e: any) {
    return {
      ok: false,
      message: `Competency Coach GHL sync request failed: ${String(
        e?.message || e
      )}`,
    };
  }
}

async function resolveEffectiveTestId(
  sb: ReturnType<typeof supa>,
  testRow: any
): Promise<string> {
  const meta = testRow?.meta ?? {};

  const genericSource =
    typeof meta?.source_test_id === "string"
      ? meta.source_test_id
      : typeof meta?.base_test_id === "string"
        ? meta.base_test_id
        : typeof meta?.parent_test_id === "string"
          ? meta.parent_test_id
          : null;

  if (genericSource && isUuidLike(genericSource)) return genericSource;

  const isWrapper = meta?.wrapper === true;
  if (!isWrapper) return testRow?.id;

  const qscVariant = String(meta?.qsc_variant || meta?.variant || "")
    .trim()
    .toLowerCase();
  const sourceTests: string[] = Array.isArray(meta?.source_tests)
    ? meta.source_tests
    : [];
  const defaultSource =
    typeof meta?.default_source_test === "string"
      ? meta.default_source_test
      : null;

  if (sourceTests.length) {
    const clean = sourceTests.filter((id) => isUuidLike(id));
    if (clean.length) {
      const { data: candidates } = await sb
        .from("tests")
        .select("id, slug")
        .in("id", clean);

      const list = Array.isArray(candidates) ? candidates : [];
      const preferredSlug =
        qscVariant === "leader" || qscVariant === "leaders"
          ? "qsc-leaders"
          : "qsc-core";

      const preferred = list.find(
        (t: any) => normalizeSlug(t.slug) === preferredSlug
      );
      if (preferred?.id) return preferred.id;
    }
  }

  if (defaultSource && isUuidLike(defaultSource)) return defaultSource;
  if (sourceTests.length && isUuidLike(sourceTests[0])) return sourceTests[0];

  return testRow?.id;
}

type LinkBehavior = {
  show_results: boolean;
  redirect_url: string | null;
  hidden_results_message: string | null;
  next_steps_url: string | null;
  email_report: boolean;
};

async function loadLinkBehavior(
  sb: ReturnType<typeof supa>,
  token: string
): Promise<LinkBehavior> {
  const a1 = await sb
    .from("test_links")
    .select(
      "show_results, redirect_url, hidden_results_message, next_steps_url, email_report"
    )
    .eq("token", token)
    .maybeSingle();

  if (!a1.error) {
    const d: any = a1.data || {};
    return {
      show_results: d.show_results ?? true,
      redirect_url: d.redirect_url ?? null,
      hidden_results_message: d.hidden_results_message ?? null,
      next_steps_url: d.next_steps_url ?? null,
      email_report: d.email_report ?? false,
    };
  }

  const a2 = await sb
    .from("test_links")
    .select(
      "show_results, redirect_url, hidden_results_message, next_steps_url, email_results"
    )
    .eq("token", token)
    .maybeSingle();

  if (!a2.error) {
    const d: any = a2.data || {};
    return {
      show_results: d.show_results ?? true,
      redirect_url: d.redirect_url ?? null,
      hidden_results_message: d.hidden_results_message ?? null,
      next_steps_url: d.next_steps_url ?? null,
      email_report: d.email_results ?? false,
    };
  }

  console.warn("[submit] test_links behavior load failed", a2.error || a1.error);
  return {
    show_results: true,
    redirect_url: null,
    hidden_results_message: null,
    next_steps_url: null,
    email_report: false,
  };
}

/* ---------------- Visibility helpers ---------------- */

function safeAB(v: any): AB | null {
  return v === "A" || v === "B" || v === "C" || v === "D" ? v : null;
}

function safeAnswerCode(v: any): AnswerCode | null {
  return v === "A" || v === "B" || v === "C" || v === "D" || v === "E"
    ? v
    : null;
}

function answerValue(code: AnswerCode): number {
  switch (code) {
    case "A":
      return 0;
    case "B":
      return 1;
    case "C":
      return 2;
    case "D":
      return 3;
    case "E":
      return 4;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundInt(n: number) {
  return Math.round(n);
}

function emptyTierCounts(): Record<Tier, number> {
  return {
    Invisible: 0,
    Emerging: 0,
    Established: 0,
    Magnetic: 0,
  };
}

function emptyPersonalityPoints(): Record<AB, number> {
  return { A: 0, B: 0, C: 0, D: 0 };
}

function emptyPrimePillarTotals(): Record<PrimePillar, number> {
  return {
    visibility: 0,
    trust: 0,
    authority: 0,
    dominance: 0,
  };
}

function emptyPrimePillarCounts(): Record<PrimePillar, number> {
  return {
    visibility: 0,
    trust: 0,
    authority: 0,
    dominance: 0,
  };
}

function isPrimeMode(
  engineKey: string | null | undefined,
  version: number | null | undefined
) {
  return (
    String(engineKey || "").toLowerCase() === "visibility_prime_v1" ||
    Number(version || 0) >= 2
  );
}

function getPrimePillarFromQuestion(q: VisQuestionRow): PrimePillar | null {
  if (q.section_code === "visibility") return "visibility";
  if (q.section_code === "trust") return "trust";
  if (q.section_code === "authority") return "authority";
  if (q.section_code === "dominance") return "dominance";

  const code = String(q.code || "").trim().toUpperCase();
  if (/^V[1-5]$/.test(code)) return "visibility";
  if (/^T[1-5]$/.test(code)) return "trust";
  if (/^A[1-5]$/.test(code)) return "authority";
  if (/^D[1-5]$/.test(code)) return "dominance";

  return null;
}

function isPersonalityQuestion(q: VisQuestionRow): boolean {
  if (q.section_code === "personality") return true;

  const code = String(q.code || "").trim().toUpperCase();
  if (/^P[1-8]$/.test(code)) return true;
  if (/^Q[1-8]$/.test(code) && q.pillar === 1) return true;

  return false;
}

function buildPrimeTierWeights(value: number): Record<Tier, number> {
  const weights = emptyTierCounts();
  switch (value) {
    case 0:
      weights.Invisible = 1;
      break;
    case 1:
      weights.Invisible = 0.5;
      weights.Emerging = 0.5;
      break;
    case 2:
      weights.Emerging = 1;
      break;
    case 3:
      weights.Established = 1;
      break;
    case 4:
      weights.Magnetic = 1;
      break;
    default:
      weights.Emerging = 1;
      break;
  }
  return weights;
}

function normalizePersonalityScoring(raw: any): ScoringPersonality | null {
  if (!raw || raw.type !== "personality") return null;
  const bucket = safeAB(raw.bucket);
  if (!bucket) return null;
  return {
    type: "personality",
    bucket,
    points: Number(raw.points) || 0,
  };
}

function normalizeLegacyTierScoring(raw: any): ScoringTier | null {
  if (!raw || raw.type !== "tier") return null;
  if (!TIERS.includes(raw.tier)) return null;
  return { type: "tier", tier: raw.tier };
}

function normalizePrimeScoring(
  raw: any,
  q: VisQuestionRow,
  answerCode: AnswerCode
) {
  const pillar = getPrimePillarFromQuestion(q);
  if (!pillar) return null;

  const value =
    raw?.type === "prime" && typeof raw?.value === "number"
      ? clamp(Number(raw.value), 0, 4)
      : answerValue(answerCode);

  const tier_weights =
    raw?.type === "prime" && raw?.tier_weights
      ? {
          Invisible: Number(raw.tier_weights?.Invisible || 0),
          Emerging: Number(raw.tier_weights?.Emerging || 0),
          Established: Number(raw.tier_weights?.Established || 0),
          Magnetic: Number(raw.tier_weights?.Magnetic || 0),
        }
      : buildPrimeTierWeights(value);

  return {
    pillar:
      raw?.type === "prime" && raw?.pillar
        ? (raw.pillar as PrimePillar)
        : pillar,
    value,
    tier_weights,
  };
}

function computeTierAndLevel(
  tierCounts: Record<Tier, number>,
  totalSignals: number
) {
  const tierRank: Record<Tier, number> = {
    Invisible: 1,
    Emerging: 2,
    Established: 3,
    Magnetic: 4,
  };

  const base: Record<Tier, number> = {
    Invisible: 0,
    Emerging: 5,
    Established: 10,
    Magnetic: 15,
  };

  let dominant: Tier = "Invisible";
  let bestCount = -1;
  let bestRank = -1;

  for (const t of TIERS) {
    const c = tierCounts[t] ?? 0;
    const r = tierRank[t];
    if (c > bestCount || (c === bestCount && r > bestRank)) {
      dominant = t;
      bestCount = c;
      bestRank = r;
    }
  }

  const support = tierCounts[dominant] ?? 0;
  const domRank = tierRank[dominant];

  const above = TIERS.filter((t) => tierRank[t] > domRank).reduce(
    (sum, t) => sum + (tierCounts[t] ?? 0),
    0
  );

  const below = TIERS.filter((t) => tierRank[t] < domRank).reduce(
    (sum, t) => sum + (tierCounts[t] ?? 0),
    0
  );

  const dominance = totalSignals ? (support + 0.5 * above) / totalSignals : 0;
  const tierLevel = clamp(Math.ceil(dominance * 5), 1, 5);
  const level = base[dominant] + tierLevel;

  return { tier: dominant, level, tierLevel, support, above, below, dominance };
}

function computeReadiness(tierLevel: number, below: number): Readiness {
  const minTierLevelReady = 4;
  const maxBelowAllowedReady = 3;
  return tierLevel >= minTierLevelReady && below <= maxBelowAllowedReady
    ? "ready_to_progress"
    : "stabilise";
}

function computePersonalityPercent(
  personalityPoints: Record<AB, number>
): Record<AB, number> {
  const total = Object.values(personalityPoints).reduce((sum, n) => sum + n, 0);
  if (!total) return { A: 0, B: 0, C: 0, D: 0 };

  return {
    A: roundInt((personalityPoints.A / total) * 100),
    B: roundInt((personalityPoints.B / total) * 100),
    C: roundInt((personalityPoints.C / total) * 100),
    D: roundInt((personalityPoints.D / total) * 100),
  };
}

function computePrimePillarScores(
  pillarTotals: Record<PrimePillar, number>,
  pillarCounts: Record<PrimePillar, number>
): Record<PrimePillar, number> {
  const out = {
    visibility: 0,
    trust: 0,
    authority: 0,
    dominance: 0,
  };

  for (const pillar of PRIME_PILLARS) {
    const total = pillarTotals[pillar] || 0;
    const count = pillarCounts[pillar] || 0;
    out[pillar] = count ? roundInt((total / (count * 4)) * 100) : 0;
  }

  return out;
}

function bandFromPct(pct: number) {
  if (pct < 40) return "weak";
  if (pct < 60) return "developing";
  if (pct < 80) return "strong";
  return "dominant";
}

function computePrimePillarBands(
  pillarScores: Record<PrimePillar, number>
) {
  return {
    visibility: bandFromPct(pillarScores.visibility),
    trust: bandFromPct(pillarScores.trust),
    authority: bandFromPct(pillarScores.authority),
    dominance: bandFromPct(pillarScores.dominance),
  };
}

function getWeakestStrongestPillar(
  pillarScores: Record<PrimePillar, number>
) {
  let weakest: PrimePillar = "visibility";
  let strongest: PrimePillar = "visibility";

  for (const pillar of PRIME_PILLARS) {
    if (pillarScores[pillar] < pillarScores[weakest]) weakest = pillar;
    if (pillarScores[pillar] > pillarScores[strongest]) strongest = pillar;
  }

  return { weakest, strongest };
}

function computeBalancePattern(
  pillarScores: Record<PrimePillar, number>
) {
  const values = PRIME_PILLARS.map((p) => pillarScores[p]);
  const spread = Math.max(...values) - Math.min(...values);
  const { strongest } = getWeakestStrongestPillar(pillarScores);

  if (spread <= 15) return "balanced";
  if (spread >= 35) return "volatile";
  return `${strongest}_led`;
}

function computePrimePatternTags(
  pillarScores: Record<PrimePillar, number>,
  tier: Tier
) {
  const tags: string[] = [];
  const values = PRIME_PILLARS.map((p) => pillarScores[p]);
  const spread = Math.max(...values) - Math.min(...values);

  if (spread <= 15) tags.push("balanced_profile");
  if (pillarScores.visibility >= 60 && pillarScores.trust < 40) {
    tags.push("visible_but_untrusted");
  }
  if (pillarScores.trust >= 60 && pillarScores.visibility < 40) {
    tags.push("credible_but_hidden");
  }
  if (
    pillarScores.visibility >= 60 &&
    pillarScores.trust >= 60 &&
    pillarScores.authority < 50
  ) {
    tags.push("authority_gap");
  }
  if (pillarScores.authority >= 60 && pillarScores.dominance < 50) {
    tags.push("decision_friction");
  }
  if (pillarScores.authority >= 70 && pillarScores.dominance >= 70) {
    tags.push("leadership_signal");
  }
  if (pillarScores.dominance >= 70 || tier === "Magnetic") {
    tags.push("validation_required");
  }

  return [...new Set(tags)];
}

function computePrimeReadiness(
  tier: Tier,
  tierLevel: number,
  pillarScores: Record<PrimePillar, number>
): Readiness {
  const minPillar = Math.min(
    pillarScores.visibility,
    pillarScores.trust,
    pillarScores.authority,
    pillarScores.dominance
  );

  if (tierLevel < 4) return "stabilise";

  switch (tier) {
    case "Invisible":
      return pillarScores.visibility >= 35 && pillarScores.trust >= 30
        ? "ready_to_progress"
        : "stabilise";

    case "Emerging":
      return (
        pillarScores.visibility >= 55 &&
        pillarScores.trust >= 55 &&
        pillarScores.authority >= 45 &&
        minPillar >= 35
      )
        ? "ready_to_progress"
        : "stabilise";

    case "Established":
      return (
        pillarScores.visibility >= 70 &&
        pillarScores.trust >= 70 &&
        pillarScores.authority >= 70 &&
        pillarScores.dominance >= 65 &&
        minPillar >= 55
      )
        ? "ready_to_progress"
        : "stabilise";

    case "Magnetic":
    default:
      return "stabilise";
  }
}

/* ---------------- End visibility helpers ---------------- */

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token?.trim();
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing token" },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const takerId: string | undefined =
      body.taker_id || body.takerId || body.tid;

    if (!takerId) {
      return NextResponse.json(
        { ok: false, error: "Missing taker_id" },
        { status: 400 }
      );
    }

    const answers: any[] = Array.isArray(body.answers) ? body.answers : [];
    const sb = supa();

    const linkBehavior = await loadLinkBehavior(sb, token);

    const { data: linkUsageRow, error: linkUsageErr } = await sb
      .from("test_links")
      .select("id, name, max_uses, use_count")
      .eq("token", token)
      .maybeSingle();

    if (linkUsageErr) {
      console.warn(
        "[submit] failed to load link usage row:",
        linkUsageErr.message
      );
    }

    const linkId: string | null = (linkUsageRow as any)?.id ?? null;
    const linkAssessmentName = normalizeText((linkUsageRow as any)?.name);
    const linkMaxUses: number | null =
      typeof (linkUsageRow as any)?.max_uses === "number"
        ? (linkUsageRow as any).max_uses
        : null;
    const linkUseCount: number =
      typeof (linkUsageRow as any)?.use_count === "number"
        ? (linkUsageRow as any).use_count
        : 0;

    if (linkMaxUses != null && linkUseCount >= linkMaxUses) {
      return NextResponse.json(
        { ok: false, error: "Link usage limit reached" },
        { status: 403 }
      );
    }

    const incrementUseCount = async () => {
      if (!linkId) return;
      const { error: incErr } = await sb
        .from("test_links")
        .update({ use_count: linkUseCount + 1 })
        .eq("id", linkId);
      if (incErr) {
        console.warn("[submit] Failed to increment use_count:", incErr.message);
      }
    };

    const { data: taker, error: takerErr } = await sb
      .from("test_takers")
      .select(
        "id, org_id, test_id, link_token, first_name, last_name, email, company, role_title, phone, website_url, industry, country_code, country_name, linkedin_profile, referred_by, last_result_url"
      )
      .eq("id", takerId)
      .eq("link_token", token)
      .maybeSingle();

    if (takerErr || !taker) {
      return NextResponse.json(
        { ok: false, error: "Taker not found for this token" },
        { status: 404 }
      );
    }

    const { data: test, error: testErr } = await sb
      .from("tests")
      .select("id, slug, meta, name, org_id")
      .eq("id", taker.test_id)
      .maybeSingle();

    if (testErr || !test) {
      return NextResponse.json(
        { ok: false, error: "Test not found for taker" },
        { status: 500 }
      );
    }

    const { data: accessRow, error: accessErr } = await sb
      .from("org_test_access")
      .select("status")
      .eq("org_id", taker.org_id)
      .eq("test_id", taker.test_id)
      .maybeSingle();

    if (accessErr) {
      return NextResponse.json(
        { ok: false, error: `Org test access lookup failed: ${accessErr.message}` },
        { status: 500 }
      );
    }

    // An organisation always has access to a test it directly owns.
    // Shared platform tests and wrappers still require an active access row.
    const ownsTest =
      String((test as any)?.org_id || "") === String(taker.org_id || "");

    let hasAccess = ownsTest || accessRow?.status === "active";

    // Wrapper tests inherit access from their source (default) test:
    // if the org has active access to the underlying source test, allow submit.
    if (!hasAccess) {
      const sourceTestId = await resolveEffectiveTestId(sb, test);
      if (sourceTestId && sourceTestId !== taker.test_id) {
        const { data: srcAccess, error: srcErr } = await sb
          .from("org_test_access")
          .select("status")
          .eq("org_id", taker.org_id)
          .eq("test_id", sourceTestId)
          .maybeSingle();

        if (srcErr) {
          return NextResponse.json(
            { ok: false, error: `Org test access lookup failed: ${srcErr.message}` },
            { status: 500 }
          );
        }

        hasAccess = srcAccess?.status === "active";
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          ok: false,
          error: "This test is not available on your current plan",
          reason: "test_access_revoked",
        },
        { status: 403 }
      );
    }

    // The test id lets the RPC match a per-engine trial credit before falling
    // back to the subscription allowance.
    const reservation = await reserveSubmission(
      taker.org_id,
      taker.id,
      taker.test_id
    );
    if (!reservation.ok) {
      const status = reservation.reason === "no_subscription" ? 403 : 402;
      return NextResponse.json(
        {
          ok: false,
          error:
            reservation.reason === "limit_reached"
              ? "Submission limit reached for your plan"
              : "No active subscription",
        },
        { status }
      );
    }

    const vis = visSupa();
    const { data: vTest, error: vTestErr } = await vis
      .from("tests")
      .select("id, engine_key, version")
      .eq("portal_test_id", taker.test_id)
      .maybeSingle();

    if (vTestErr) {
      return NextResponse.json(
        {
          ok: false,
          error: `Visibility test lookup failed: ${vTestErr.message}`,
        },
        { status: 500 }
      );
    }

    if (vTest?.id) {
      const primeMode = isPrimeMode(vTest.engine_key, vTest.version);

      const { data: vQsRaw, error: vqErr } = await vis
        .from("questions")
        .select("*")
        .eq("test_id", vTest.id)
        .eq("is_active", true)
        .order("idx", { ascending: true });

      if (vqErr) {
        return NextResponse.json(
          {
            ok: false,
            error: `Visibility questions load failed: ${vqErr.message}`,
          },
          { status: 500 }
        );
      }

      const vQs: VisQuestionRow[] = (vQsRaw || []).map((q: any) => ({
        id: String(q.id),
        code: String(q.code),
        idx: Number(q.idx),
        text:
          normalizeText(
            q.text || q.question_text || q.prompt || q.title || q.label
          ) || null,
        pillar: Number(q.pillar),
        section_code: q.section_code ?? null,
        is_internal_only: Boolean(q.is_internal_only),
        is_scored: Boolean(q.is_scored),
      }));

      const qIds = vQs.map((q) => q.id);

      const { data: vOptsRaw, error: voErr } = await vis
        .from("options")
        .select("*")
        .in("question_id", qIds)
        .eq("is_active", true);

      if (voErr) {
        return NextResponse.json(
          {
            ok: false,
            error: `Visibility options load failed: ${voErr.message}`,
          },
          { status: 500 }
        );
      }

      const vOpts: VisOptionRow[] = (vOptsRaw || []).map((o: any) => ({
        ...o,
        question_id: String(o.question_id),
        option_code: String(o.option_code),
        scoring: o.scoring as VisScoring,
        is_active: Boolean(o.is_active),
      }));

      const qById = new Map<string, VisQuestionRow>();
      for (const q of vQs) qById.set(q.id, q);

      const scoringMap: Record<string, Partial<Record<AnswerCode, VisScoring>>> =
        {};
      const optionTextMap: Record<
        string,
        Partial<Record<AnswerCode, string>>
      > = {};

      for (const o of vOpts) {
        const answerCode = safeAnswerCode(o.option_code);
        if (!answerCode) continue;

        scoringMap[o.question_id] = scoringMap[o.question_id] || {};
        scoringMap[o.question_id]![answerCode] = o.scoring;

        const displayText = getVisibilityOptionDisplayText(o);
        if (displayText) {
          optionTextMap[o.question_id] = optionTextMap[o.question_id] || {};
          optionTextMap[o.question_id]![answerCode] = displayText;
        }
      }

      const personalityPoints = emptyPersonalityPoints();
      const tierCounts = emptyTierCounts();
      const primePillarTotals = emptyPrimePillarTotals();
      const primePillarCounts = emptyPrimePillarCounts();

      let ladderSignals = 0;
      let answeredQuestions = 0;
      let answeredPersonalityQuestions = 0;

      const storedAnswers: Record<string, AnswerCode> = {};
      const personalityAnswerLabels: Record<number, string> = {};

      for (const row of answers) {
        const qid = row?.question_id || row?.qid || row?.id;
        if (!qid) continue;

        const q = qById.get(String(qid));
        if (!q) continue;

        const sel = toZeroBasedSelected(row);
        if (sel == null || sel < 0 || sel > 4) continue;

        const answerCode: AnswerCode =
          sel === 0 ? "A" : sel === 1 ? "B" : sel === 2 ? "C" : sel === 3 ? "D" : "E";

        answeredQuestions += 1;
        storedAnswers[q.code] = answerCode;

        const personalityQuestionNumber =
          getVisibilityPersonalityQuestionNumber(q);

        if (personalityQuestionNumber) {
          const payloadAnswerText = normalizeText(
            row?.selected_text ||
              row?.selectedText ||
              row?.answer_text ||
              row?.answerText ||
              row?.label
          );

          const selectedAnswerText =
            payloadAnswerText || optionTextMap[q.id]?.[answerCode] || "";

          if (selectedAnswerText) {
            personalityAnswerLabels[personalityQuestionNumber] =
              selectedAnswerText;
          } else {
            console.warn(
              "[visibility submit] Could not resolve display text for a personality answer",
              {
                question_code: q.code,
                question_id: q.id,
                answer_code: answerCode,
              }
            );
          }
        }

        const rawScoring = scoringMap[q.id]?.[answerCode];

        if (isPersonalityQuestion(q) || q.is_internal_only || q.is_scored === false) {
          const personality = normalizePersonalityScoring(rawScoring);
          if (personality) {
            personalityPoints[personality.bucket] += Number(personality.points || 0);
            answeredPersonalityQuestions += 1;
          }
          continue;
        }

        if (primeMode) {
          const prime = normalizePrimeScoring(rawScoring, q, answerCode);
          if (!prime) continue;

          primePillarTotals[prime.pillar] += prime.value;
          primePillarCounts[prime.pillar] += 1;

          for (const tierKey of TIERS) {
            tierCounts[tierKey] += Number(prime.tier_weights[tierKey] ?? 0);
          }

          ladderSignals += 1;
          continue;
        }

        const legacyTier = normalizeLegacyTierScoring(rawScoring);
        if (legacyTier) {
          tierCounts[legacyTier.tier] += 1;
          ladderSignals += 1;
        }
      }

      const personality_percent = computePersonalityPercent(personalityPoints);

      let personality_type: AB | null = null;
      const totalPersonalityPoints = Object.values(personalityPoints).reduce(
        (sum, n) => sum + n,
        0
      );

      if (totalPersonalityPoints > 0) {
        let bestBucket: AB = "A";
        let bestPoints = -1;
        for (const bucket of ["A", "B", "C", "D"] as AB[]) {
          if (personalityPoints[bucket] > bestPoints) {
            bestPoints = personalityPoints[bucket];
            bestBucket = bucket;
          }
        }
        personality_type = bestBucket;
      }

      const { tier, level, tierLevel, below, dominance, support, above } =
        computeTierAndLevel(tierCounts, ladderSignals);

      let readiness: Readiness = "stabilise";
      let pillar_scores: Record<string, number> = {};
      let pillar_bands: Record<string, string> = {};
      let weakest_pillar: string | null = null;
      let strongest_pillar: string | null = null;
      let balance_pattern: string | null = null;
      let pattern_tags: string[] = [];
      let overall_pct: number | null = null;
      let validation_required = false;
      let validation_status: string | null = null;

      if (primeMode) {
        const primePillarScores = computePrimePillarScores(
          primePillarTotals,
          primePillarCounts
        );
        const primePillarBands = computePrimePillarBands(primePillarScores);
        const { weakest, strongest } = getWeakestStrongestPillar(primePillarScores);

        const totalPrimeValue = PRIME_PILLARS.reduce(
          (sum, p) => sum + primePillarTotals[p],
          0
        );

        overall_pct = ladderSignals
          ? roundInt((totalPrimeValue / (ladderSignals * 4)) * 100)
          : 0;

        readiness = computePrimeReadiness(tier, tierLevel, primePillarScores);
        balance_pattern = computeBalancePattern(primePillarScores);
        pattern_tags = computePrimePatternTags(primePillarScores, tier);

        validation_required =
          primePillarScores.dominance >= 70 ||
          (primePillarScores.authority >= 70 && tier === "Magnetic");

        validation_status = validation_required
          ? "self_report_validation_required"
          : "self_report_only";

        pillar_scores = primePillarScores;
        pillar_bands = primePillarBands;
        weakest_pillar = weakest;
        strongest_pillar = strongest;
      } else {
        readiness = computeReadiness(tierLevel, below);
      }

      const fullName = [taker.first_name, taker.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      const { data: sub, error: subErr } = await vis
        .from("submissions")
        .insert({
          org_id: taker.org_id,
          test_id: vTest.id,
          test_link_id: null,
          token,
          taker_name: fullName || null,
          taker_email: taker.email ?? null,
          answers: storedAnswers,
          metadata: {
            taker_id: taker.id,
            portal_test_id: taker.test_id,
            mode: primeMode ? "prime" : "legacy",
          },
        })
        .select("id")
        .single();

      if (subErr || !sub?.id) {
        return NextResponse.json(
          {
            ok: false,
            error: `Visibility submission insert failed: ${subErr?.message || "unknown"}`,
          },
          { status: 500 }
        );
      }

      const resultInsert: any = {
        submission_id: sub.id,
        engine_key: primeMode ? "visibility_prime_v1" : "visibility_v1",
        version: primeMode ? 2 : 1,
        personality_type,
        personality_points: personalityPoints,
        personality_percent: personality_percent,
        tier,
        level,
        tier_counts: tierCounts,
        readiness,
        computed: {
          portal_test_id: taker.test_id,
          visibility_test_id: vTest.id,
          mode: primeMode ? "prime" : "legacy",
          tier_level: tierLevel,
          overall_pct,
          ladder_question_count: ladderSignals,
          personality_question_count: answeredPersonalityQuestions,
          scoring_model: primeMode ? "prime_20q_v2" : "legacy_v1",
          validation_required,
          validation_status,
        },
        debug: {
          answeredQuestions,
          ladderSignals,
          support,
          above,
          below,
          dominance,
          primePillarTotals: primeMode ? primePillarTotals : undefined,
          primePillarCounts: primeMode ? primePillarCounts : undefined,
        },
      };

      if (primeMode) {
        resultInsert.pillar_scores = pillar_scores;
        resultInsert.pillar_bands = pillar_bands;
        resultInsert.weakest_pillar = weakest_pillar;
        resultInsert.strongest_pillar = strongest_pillar;
        resultInsert.balance_pattern = balance_pattern;
        resultInsert.pattern_tags = pattern_tags;
      }

      const { data: resRow, error: resErr } = await vis
        .from("results")
        .insert(resultInsert)
        .select(
          "id, engine_key, version, tier, level, readiness, personality_type, personality_percent, pillar_scores, pillar_bands, weakest_pillar, strongest_pillar, balance_pattern, pattern_tags, computed"
        )
        .single();

      if (resErr || !resRow?.id) {
        return NextResponse.json(
          {
            ok: false,
            error: `Visibility results insert failed: ${resErr?.message || "unknown"}`,
          },
          { status: 500 }
        );
      }

      if (!primeMode) {
        try {
          const { data: pillarRpc, error: pillarErr } = await vis.rpc(
            "compute_pillar_signals_for_submission",
            { p_submission_id: sub.id }
          );

          if (!pillarErr && pillarRpc?.ok === true && pillarRpc?.computed) {
            const pillarComputed = pillarRpc.computed;

            await vis
              .from("results")
              .update({
                pillar_scores: pillarComputed.pillar_scores ?? {},
                pillar_bands: pillarComputed.pillar_bands ?? {},
                weakest_pillar: pillarComputed.weakest_pillar ?? null,
                strongest_pillar: pillarComputed.strongest_pillar ?? null,
                pattern_tags: Array.isArray(pillarComputed.pattern_tags)
                  ? pillarComputed.pattern_tags
                  : [],
              })
              .eq("id", resRow.id);
          }
        } catch (e) {
          console.warn("[visibility submit] legacy pillar compute failed", e);
        }
      }

      const totals = {
        visibility: {
          tier,
          level,
          readiness,
          personality_type,
          personality_points: personalityPoints,
          personality_percent,
          tier_counts: tierCounts,
          pillar_scores,
          pillar_bands,
          weakest_pillar,
          strongest_pillar,
          balance_pattern,
          pattern_tags,
          overall_pct,
          validation_required,
          validation_status,
        },
        meta: {
          engine: primeMode ? "visibility_prime_v1" : "visibility_v1",
          portal_test_id: taker.test_id,
          visibility_test_id: vTest.id,
          submission_id: sub.id,
          result_id: resRow.id,
          mode: primeMode ? "prime" : "legacy",
        },
      };

      const { error: sub2Err } = await sb.from("test_submissions").insert({
        taker_id: taker.id,
        test_id: taker.test_id,
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

      if (sub2Err) {
        return NextResponse.json(
          {
            ok: false,
            error: `Portal submission insert failed: ${sub2Err.message}`,
          },
          { status: 500 }
        );
      }

      await incrementUseCount();

      const { error: upErr } = await sb
        .from("test_results")
        .upsert({ taker_id: taker.id, totals }, { onConflict: "taker_id" });

      if (upErr) {
        return NextResponse.json(
          { ok: false, error: `Portal results upsert failed: ${upErr.message}` },
          { status: 500 }
        );
      }

      const origin = getBaseUrl();

      const reportPath = `/t/${encodeURIComponent(token)}/visibility/report?tid=${encodeURIComponent(
        taker.id
      )}&sid=${encodeURIComponent(sub.id)}`;

      const resultPath = `/t/${encodeURIComponent(token)}/result?tid=${encodeURIComponent(
        taker.id
      )}`;

      const baseReportUrl = `${origin}${reportPath}`;
      const baseResultUrl = `${origin}${resultPath}`;

      await sb
        .from("test_takers")
        .update({
          status: "completed",
          last_result_url: reportPath,
        })
        .eq("id", taker.id)
        .eq("link_token", token);

      const { data: orgRow } = await sb
        .from("orgs")
        .select("id, slug, name, support_email, notification_email, website_url")
        .eq("id", taker.org_id)
        .maybeSingle();

      const orgName =
        String((orgRow as any)?.name || (orgRow as any)?.slug || "").trim() ||
        "MindCanvas";

      const supportEmail =
        normalizeEmail((orgRow as any)?.support_email) || getDefaultSupportEmail();

      const visibilityOrgSlug = normalizeSlug((orgRow as any)?.slug);
      const visibilityAllowedOrgId = normalizeText(
        process.env.WHATSWHAT_GHL_ALLOWED_ORG_ID
      );
      const visibilityAllowedOrgSlug = normalizeSlug(
        process.env.WHATSWHAT_GHL_ALLOWED_ORG_SLUG
      );

      const isAllowedVisibilityGhlOrg = visibilityAllowedOrgId
        ? String(taker.org_id) === visibilityAllowedOrgId
        : Boolean(
            visibilityAllowedOrgSlug &&
              visibilityOrgSlug === visibilityAllowedOrgSlug
          );

      const visibilityCompletedAt = new Date().toISOString();
      let visibilityGhlSyncResult: GhlSyncResult | null = null;

      if (primeMode && isAllowedVisibilityGhlOrg) {
        visibilityGhlSyncResult = await syncVisibilityLadderToGhl({
          taker,
          assessmentName:
            linkAssessmentName ||
            normalizeText(test.name) ||
            "Visibility Ladder",
          assessmentId: String(sub.id),
          reportUrl: baseReportUrl,
          completedAt: visibilityCompletedAt,
          personalityType: personality_type,
          personalityPercent: personality_percent,
          personalityAnswers: personalityAnswerLabels,
          tier,
          level,
          readiness,
          pillarScores: pillar_scores,
          overallPct: overall_pct,
          strongestPillar: strongest_pillar,
          weakestPillar: weakest_pillar,
          balancePattern: balance_pattern,
          patternTags: pattern_tags,
        });

        if (
          !visibilityGhlSyncResult.ok &&
          !visibilityGhlSyncResult.skipped
        ) {
          console.error(
            "[visibility submit] WhatsWhat GHL sync failed",
            visibilityGhlSyncResult
          );
        } else if (visibilityGhlSyncResult.skipped) {
          console.warn(
            "[visibility submit] WhatsWhat GHL sync skipped",
            visibilityGhlSyncResult
          );
        }
      } else if (primeMode) {
        visibilityGhlSyncResult = {
          ok: true,
          skipped: true,
          message:
            visibilityAllowedOrgId || visibilityAllowedOrgSlug
              ? "Skipped Visibility Ladder GHL sync because the submission belongs to a different organisation."
              : "Skipped Visibility Ladder GHL sync because WHATSWHAT_GHL_ALLOWED_ORG_ID or WHATSWHAT_GHL_ALLOWED_ORG_SLUG is not configured.",
        };

        console.info("[visibility submit] WhatsWhat GHL sync ring-fenced", {
          taker_id: taker.id,
          submission_org_id: String(taker.org_id),
          submission_org_slug: visibilityOrgSlug || null,
          allowed_org_id: visibilityAllowedOrgId || null,
          allowed_org_slug: visibilityAllowedOrgSlug || null,
        });
      }

      let takerEmailResult: any = null;
      try {
        if (linkBehavior.email_report && normalizeEmail(taker.email)) {
          takerEmailResult = await sendTemplatedEmail({
            orgId: taker.org_id,
            type: "test_taker_report",
            to: String(taker.email),
            context: {
              first_name: taker.first_name || "there",
              test_name: (test.name as string) || "Visibility Ladder",
              report_link: baseReportUrl,
              org_name: orgName,
              support_email: supportEmail,
            },
          });

          if (!takerEmailResult?.ok) {
            console.error("[visibility submit] test_taker_report failed", takerEmailResult);
          }
        }
      } catch (e) {
        console.error("[visibility submit] test_taker_report unexpected error", e);
      }

      let ownerNotification: any = null;
      try {
        const sentTo =
          normalizeEmail((orgRow as any)?.notification_email) ||
          getDefaultInternalEmail();

        if (normalizeEmail(sentTo)) {
          const internalReportLink = `${origin}/portal/${(orgRow as any)?.slug}/database/${taker.id}`;
          const internalResultsDashboardLink = `${origin}/portal/${(orgRow as any)?.slug}/dashboard?testId=${taker.test_id}`;

          ownerNotification = await sendTemplatedEmail({
            orgId: (orgRow as any)?.id || taker.org_id,
            type: "test_owner_notification",
            to: sentTo,
            context: {
              owner_first_name: "",
              owner_full_name: "",
              test_taker_full_name: fullName || (taker as any).email || "",
              test_taker_email: (taker as any).email || "",
              test_taker_mobile: (taker as any).phone || "",
              test_taker_org: (taker as any).company || "",
              test_name: (test.name as string) || "Visibility Ladder",
              internal_report_link: internalReportLink,
              internal_results_dashboard_link: internalResultsDashboardLink,
              org_name: orgName,
              owner_website: (orgRow as any)?.website_url || "",
            },
          });

          if (!ownerNotification?.ok) {
            console.error(
              "[visibility submit] test_owner_notification failed",
              ownerNotification
            );
          }
        }
      } catch (e) {
        console.error("[visibility submit] owner notification unexpected error", e);
      }

      const redirectPath =
        linkBehavior.show_results === true
          ? reportPath
          : linkBehavior.redirect_url && linkBehavior.redirect_url.trim().length
            ? linkBehavior.redirect_url.trim()
            : resultPath;

      return NextResponse.json({
        ok: true,
        totals,
        link: {
          show_results: linkBehavior.show_results,
          redirect_url: linkBehavior.redirect_url,
          hidden_results_message: linkBehavior.hidden_results_message,
          next_steps_url: linkBehavior.next_steps_url,
          email_report: linkBehavior.email_report,
        },
        redirect: redirectPath,
        redirect_url: redirectPath,
        result_url: baseResultUrl,
        report_url: baseReportUrl,
        visibility: {
          submission_id: sub.id,
          result_id: resRow.id,
          visibility_test_id: vTest.id,
          engine_key: resRow.engine_key,
          version: resRow.version,
          ghl_sync: visibilityGhlSyncResult,
        },
        owner_notification: ownerNotification,
        taker_email: takerEmailResult,
      });
    }

    const effectiveTestId = await resolveEffectiveTestId(sb, test);

    const slug: string = (test.slug as string) || "";
    const meta: any = test.meta || {};
    const frameworkType: string =
      (meta?.frameworkType as string) ||
      (meta?.frameworktype as string) ||
      "";
    const kind: string = (meta?.kind as string) || "";
    const resultType: string =
      (meta?.resultType as string) || (meta?.resulttype as string) || "";
    const qscVariant: string =
      (meta?.qsc_variant as string) || (meta?.variant as string) || "";

    const slugLower = slug.toLowerCase();
    const frameworkTypeLower = frameworkType.toLowerCase();
    const kindLower = kind.toLowerCase();
    const resultTypeLower = resultType.toLowerCase();
    const qscVariantLower = qscVariant.toLowerCase();
    const testFamilyLower = String(
      meta?.test_family || meta?.testFamily || ""
    ).toLowerCase();
    const testNameLower = String(test.name || "").toLowerCase().trim();

    const isQscTest =
      slugLower.startsWith("qsc-") ||
      frameworkTypeLower === "qsc" ||
      kindLower === "qsc" ||
      resultTypeLower === "qsc" ||
      testFamilyLower === "qsc" ||
      ["entrepreneur", "leader", "leaders"].includes(qscVariantLower);

    const isQscEntrepreneur =
      isQscTest && (qscVariantLower === "entrepreneur" || slugLower.includes("core"));

    const isGedTest =
      meta?.is_ged === true ||
      String(meta?.assessment_name || "").toLowerCase().trim() ===
        "growth engine diagnostic" ||
      String(meta?.report_brand || "").toLowerCase().trim() === "ged" ||
      String(meta?.public_report_route || "").toLowerCase().trim() === "ged" ||
      slugLower.includes("growth-engine-diagnostic") ||
      slugLower.startsWith("ged-") ||
      testNameLower.includes("growth engine diagnostic") ||
      testNameLower.startsWith("ged");

    const inevitableEngineKey = String(meta?.engine_key || "")
      .toLowerCase()
      .trim();

    const isInevitableStandardTest =
      meta?.is_inevitable_standard === true ||
      inevitableEngineKey === "inevitable_standard" ||
      inevitableEngineKey === "inevitable-standard" ||
      slugLower === "inevitable-standard" ||
      slugLower.startsWith("inevitable-standard-") ||
      testNameLower.includes("inevitable standard");

    const qscAudience: "entrepreneur" | "leader" = isQscEntrepreneur
      ? "entrepreneur"
      : "leader";

    const { data: questions, error: qErr } = await sb
      .from("test_questions")
      .select("id, idx, text, category, type, options, profile_map, weights")
      .eq("test_id", effectiveTestId)
      .order("idx", { ascending: true })
      .order("created_at", { ascending: true });

    if (qErr) {
      return NextResponse.json(
        { ok: false, error: `Questions load failed: ${qErr.message}` },
        { status: 500 }
      );
    }

    const byId: Record<string, PortalQuestionRow> = {};
    for (const q of questions || []) {
      byId[q.id] = q;
    }

    let inevitableStandardScore: ReturnType<
      typeof mapInevitableStandardSubmission
    >["score"] | null = null;
    let inevitableStandardConstraints: ReturnType<
      typeof deriveInevitableStandardConstraints
    > | null = null;
    let inevitableStandardRevenue: ReturnType<
      typeof calculateInevitableStandardRevenueInStructure
    > | null = null;

    if (isInevitableStandardTest) {
      const storedQuestions = (questions || []).map(
        (question: PortalQuestionRow) => {
          const rawIndex = question.idx;

          const numericIndex =
            typeof rawIndex === "number"
              ? rawIndex
              : typeof rawIndex === "string" && rawIndex.trim()
                ? Number(rawIndex)
                : null;

          return {
            id: question.id,
            idx:
              typeof numericIndex === "number" &&
              Number.isInteger(numericIndex)
                ? numericIndex
                : null,
          };
        }
      );

      const normalizedAnswers: InevitableStandardSubmittedAnswer[] = [];

      for (const row of answers) {
        const questionId =
          row?.question_id || row?.qid || row?.id;

        if (!questionId) continue;

        normalizedAnswers.push({
          question_id: String(questionId),
          choice_index: toZeroBasedSelected(row),
          text:
            typeof row?.text === "string"
              ? row.text
              : null,
        });
      }

      const mapped = mapInevitableStandardSubmission({
        questions: storedQuestions,
        answers: normalizedAnswers,
        currency:
          normalizeText(
            meta?.default_currency ||
              meta?.currency ||
              meta?.commercial_context?.currency
          ) || null,
      });

      if (mapped.issues.length > 0) {
        console.warn(
          "[submit] Inevitable Standard validation failed",
          {
            taker_id: taker.id,
            test_id: taker.test_id,
            effective_test_id: effectiveTestId,
            issues: mapped.issues,
          }
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "The Inevitable Standard submission is incomplete or invalid.",
            issues: mapped.issues,
          },
          { status: 400 }
        );
      }

      inevitableStandardScore = mapped.score;

      // Constraint Engine + Revenue-in-Structure. These are pure, synchronous
      // functions with no IO, so on a valid score they will not throw. If they
      // ever do, degrade gracefully: the readiness score is still valid and
      // useful on its own, so store it without the constraint/RRE layer rather
      // than discarding a completed submission.
      try {
        const constraints = deriveInevitableStandardConstraints({
          // The engine reads the founder's Q13/Q29 free text from
          // score.context_answers, which mapSubmission has already populated.
          score: mapped.score,
        });

        const primaryPillarPercentage = Number(
          mapped.score.pillars?.[constraints.primary_constraint]?.percentage,
        );

        const revenueInStructure =
          calculateInevitableStandardRevenueInStructure({
            primary_constraint: constraints.primary_constraint,
            confidence: constraints.confidence,
            primary_constraint_pillar_percentage: Number.isFinite(
              primaryPillarPercentage,
            )
              ? primaryPillarPercentage
              : 0,
            commercial_context: mapped.commercial_context,
          });

        inevitableStandardConstraints = constraints;
        inevitableStandardRevenue = revenueInStructure;
      } catch (constraintError) {
        console.warn(
          "[submit] Inevitable Standard constraint/RRE derivation failed; storing score only",
          {
            taker_id: taker.id,
            test_id: taker.test_id,
            effective_test_id: effectiveTestId,
            error:
              constraintError instanceof Error
                ? constraintError.message
                : String(constraintError),
          },
        );
      }
    }

    const gedDiagnostics = extractGedDiagnostics(questions || [], answers);

    const { data: labels, error: labErr } = await sb
      .from("test_profile_labels")
      .select("profile_code, profile_name, frequency_code")
      .eq("test_id", effectiveTestId);

    if (labErr) {
      return NextResponse.json(
        { ok: false, error: `Labels load failed: ${labErr.message}` },
        { status: 500 }
      );
    }

    const { data: frequencyLabelRows, error: frequencyLabelErr } = await sb
      .from("test_frequency_labels")
      .select("*")
      .eq("test_id", effectiveTestId);

    if (frequencyLabelErr) {
      console.warn(
        "[submit] frequency labels load failed",
        frequencyLabelErr.message
      );
    }

    const nameToCode = new Map<string, string>();
    const profileCodeToName = new Map<string, string>();
    const codeToFreq = new Map<string, AB>();
    const frequencyNameByCode = new Map<string, string>();

    const competencyCoachFrequencyFallback: Record<AB, string> = {
      A: "Catalyst",
      B: "Communicator",
      C: "Rhythmic",
      D: "Observer",
    };

    for (const row of frequencyLabelRows || []) {
      const code = String(
        (row as any)?.frequency_code || (row as any)?.code || ""
      )
        .trim()
        .toUpperCase();

      const label = normalizeText(
        (row as any)?.frequency_name ||
          (row as any)?.label ||
          (row as any)?.name ||
          (row as any)?.title
      );

      if (code && label) {
        frequencyNameByCode.set(code, label);
      }
    }

    for (const r of labels || []) {
      const code = String((r as any).profile_code || "").trim();
      const name = String((r as any).profile_name || "").trim();
      const f = String((r as any).frequency_code || "").trim().toUpperCase();

      if (name && code) nameToCode.set(name, code);
      if (code && name) profileCodeToName.set(code, name);

      if (code) {
        if (f === "A" || f === "B" || f === "C" || f === "D") {
          codeToFreq.set(code, f as AB);
        } else {
          const implied = profileCodeToFreq(code);
          if (implied) codeToFreq.set(code, implied);
        }
      }
    }

    const freqTotals: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };
    const profileTotals: Record<string, number> = {};
    let qscSummary: QscResultSummary | null = null;

    const hasRhythmLayer =
      meta?.has_rhythm_layer === true ||
      meta?.rhythm?.enabled === true ||
      String(meta?.report_layout || "") === "team_puzzle_rhythm_v1" ||
      String(meta?.variant || "") === "rhythm_edition";

    const rhythmQuestions = (questions || []).filter(
      (q: PortalQuestionRow) =>
        String(q.category || "").toLowerCase() === "rhythm"
    );

    if (hasRhythmLayer && rhythmQuestions.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "RHYTHM scoring is enabled for this test, but no RHYTHM questions were found.",
        },
        { status: 500 }
      );
    }

    const rhythmScore = hasRhythmLayer
      ? scoreRhythmLayer({
          rhythmQuestions,
          answers,
        })
      : null;

    for (let idx = 0; idx < answers.length; idx++) {
      const row = answers[idx];
      const qid = row?.question_id || row?.qid || row?.id;
      const q: PortalQuestionRow | undefined = qid ? byId[qid] : undefined;
      if (!q) continue;

      if (String(q.category || "").toLowerCase() === "diagnostic") continue;

      const mapEntries = coerceProfileMapEntries(q.profile_map);
      const fallbackEntries = coerceProfileMapEntries(q.weights);
      const scoringEntries = mapEntries.length ? mapEntries : fallbackEntries;
      if (!Array.isArray(scoringEntries) || scoringEntries.length === 0) continue;

      const sel = toZeroBasedSelected(row);
      if (sel == null || sel < 0 || sel >= scoringEntries.length) continue;

      const entry = scoringEntries[sel] || {};
      const points = asNumber(entry.points, 0);
      let pcode = String(entry.profile || "").trim();

      if (pcode && !/^P(?:ROFILE)?[_\s-]?\d+$/i.test(pcode)) {
        const fromName = nameToCode.get(pcode);
        if (fromName) pcode = fromName;
      }
      if (!pcode || points <= 0) continue;

      profileTotals[pcode] = (profileTotals[pcode] || 0) + points;

      const f = codeToFreq.get(pcode) || profileCodeToFreq(pcode);
      if (f) freqTotals[f] += points;
    }

    const sortedProfiles = Object.entries(profileTotals).sort((a, b) => b[1] - a[1]);
    const topProfileCode = sortedProfiles[0]?.[0] || null;
    const topProfileLabel = topProfileCode
      ? profileCodeToName.get(topProfileCode) || topProfileCode
      : null;

    const sortedFrequencies = Object.entries(freqTotals).sort((a, b) => b[1] - a[1]);
    const topFrequencyCode = (sortedFrequencies[0]?.[0] || null) as AB | null;
    const topFrequencyLabel = topFrequencyCode
      ? frequencyNameByCode.get(topFrequencyCode) ||
        (slugLower === "competency-coach"
          ? competencyCoachFrequencyFallback[topFrequencyCode]
          : topFrequencyCode)
      : null;

    // The constraint and revenue-in-structure results are stored as sibling
    // keys on the score object, matching how totals.inevitable_standard is
    // already a single flat result object.
    const inevitableStandardTotals = inevitableStandardScore
      ? {
          ...inevitableStandardScore,
          constraints: inevitableStandardConstraints,
          revenue_in_structure: inevitableStandardRevenue,
        }
      : null;

    const totals = {
      frequencies: {
        A: freqTotals.A,
        B: freqTotals.B,
        C: freqTotals.C,
        D: freqTotals.D,
      },
      profiles: profileTotals,
      inevitable_standard: inevitableStandardTotals,
      meta: {
        wrapper_test_id: taker.test_id,
        effective_test_id: effectiveTestId,
        is_ged: isGedTest,
        is_inevitable_standard: isInevitableStandardTest,
        inevitable_standard: inevitableStandardScore
          ? {
              model_version:
                inevitableStandardScore.model_version,
              scoring_version:
                inevitableStandardScore.scoring_version,
              constraint_version:
                inevitableStandardScore.constraint_version,
              scoring_complete:
                inevitableStandardScore.scoring_complete,
              qa_flags:
                inevitableStandardScore.qa_flags,
              constraints_derived: inevitableStandardConstraints !== null,
              revenue_in_structure_derived:
                inevitableStandardRevenue !== null,
            }
          : null,
        ged: hasGedDiagnostics(gedDiagnostics) ? gedDiagnostics : null,
        rhythm: rhythmScore
          ? {
              enabled: true,
              scoring_version: "rhythm_v1",
              primary_driver: rhythmScore.primaryDriver,
              secondary_driver: rhythmScore.secondaryDriver,
              flow_drivers: rhythmScore.flowDrivers,
              stabilising_drivers: rhythmScore.stabilisingDrivers,
              frustration_drivers: rhythmScore.frustrationDrivers,
              answered_questions: rhythmScore.answeredRhythmQuestions,
              question_count: rhythmScore.rhythmQuestionCount,
            }
          : null,
      },
    };

    const { data: submissionRow, error: subErr } = await sb
      .from("test_submissions")
      .insert({
        taker_id: taker.id,
        test_id: taker.test_id,
        link_token: token,
        totals,
        answers_json: answers,
        raw_answers: answers,
        first_name: taker.first_name ?? null,
        last_name: taker.last_name ?? null,
        email: taker.email ?? null,
        company: taker.company ?? null,
        role_title: taker.role_title ?? null,
      })
      .select("id")
      .single();

    if (subErr) {
      return NextResponse.json(
        { ok: false, error: `Submission insert failed: ${subErr.message}` },
        { status: 500 }
      );
    }

    await incrementUseCount();

    if (rhythmScore && submissionRow?.id) {
      const { error: rhythmErr } = await sb.from("rhythm_results").insert({
        org_id: taker.org_id,
        test_id: taker.test_id,
        taker_id: taker.id,
        submission_id: submissionRow.id,
        link_token: token,

        driver_raw_scores: rhythmScore.rawScores,
        driver_percentages: rhythmScore.percentages,
        ranked_drivers: rhythmScore.rankedDrivers,

        flow_drivers: rhythmScore.flowDrivers,
        stabilising_drivers: rhythmScore.stabilisingDrivers,
        frustration_drivers: rhythmScore.frustrationDrivers,

        primary_driver: rhythmScore.primaryDriver,
        secondary_driver: rhythmScore.secondaryDriver,

        scoring_version: "rhythm_v1",
        answers_snapshot: rhythmScore.answersSnapshot,
        meta: {
          answered_questions: rhythmScore.answeredRhythmQuestions,
          question_count: rhythmScore.rhythmQuestionCount,
          report_layout: "team_puzzle_rhythm_v1",
        },
      });

      if (rhythmErr) {
        return NextResponse.json(
          {
            ok: false,
            error: `RHYTHM result insert failed: ${rhythmErr.message}`,
          },
          { status: 500 }
        );
      }
    }

    const { error: upErr } = await sb
      .from("test_results")
      .upsert({ taker_id: taker.id, totals }, { onConflict: "taker_id" });

    if (upErr) {
      return NextResponse.json(
        { ok: false, error: `Results upsert failed: ${upErr.message}` },
        { status: 500 }
      );
    }

    if (isQscTest) {
      try {
        const questionsForScoring = (questions || [])
          .map((q: any) => {
            const mapEntries = coerceProfileMapEntries(q.profile_map);
            const fallbackEntries = coerceProfileMapEntries(q.weights);
            const scoringEntries = mapEntries.length ? mapEntries : fallbackEntries;

            return {
              id: q.id as string,
              idx: (q.idx as number | null) ?? null,
              category: q.category ?? null,
              profile_map: scoringEntries as any,
            };
          })
          .filter(
            (q) =>
              String(q.category || "").toLowerCase() !== "diagnostic" &&
              Array.isArray(q.profile_map) &&
              q.profile_map.length > 0
          );

        const answersForScoring = answers
          .map((row: any) => {
            const qid = row?.question_id || row?.qid || row?.id;
            const q = qid ? byId[qid] : null;
            const sel = toZeroBasedSelected(row);
            return {
              question_id: qid as string,
              choice: sel ?? -1,
              category: q?.category ?? null,
            };
          })
          .filter(
            (a: any) =>
              String(a.category || "").toLowerCase() !== "diagnostic" &&
              a.question_id &&
              a.choice >= 0
          )
          .map((a: any) => ({
            question_id: a.question_id,
            choice: a.choice,
          }));

        if (questionsForScoring.length === 0) {
          throw new Error(
            `QSC scoring found no scoreable questions for effective_test_id=${effectiveTestId}`
          );
        }

        if (answersForScoring.length === 0) {
          throw new Error("QSC scoring found no scoreable answers in submit payload");
        }

        const scoring = calculateQscScores(
          questionsForScoring,
          answersForScoring
        );

        const personalityCount = Object.keys(
          scoring.personalityTotals || {}
        ).length;
        const mindsetCount = Object.keys(scoring.mindsetTotals || {}).length;

        if (personalityCount === 0 && mindsetCount === 0) {
          throw new Error(
            `QSC scoring produced empty totals. personality=${JSON.stringify(
              scoring.personalityTotals || {}
            )} mindset=${JSON.stringify(scoring.mindsetTotals || {})}`
          );
        }

        qscSummary = {
          audience: qscAudience,
          personality_layer: formatQscDisplay(scoring.primaryPersonality),
          mindset_layer: formatQscDisplay(scoring.primaryMindset),
          quantum_profile: formatQscDisplay(scoring.combinedProfileCode),
          primary_personality_raw: normalizeText(scoring.primaryPersonality) || null,
          primary_mindset_raw: normalizeText(scoring.primaryMindset) || null,
          combined_profile_code_raw:
            normalizeText(scoring.combinedProfileCode) || null,
        };

        let qscProfileId: string | null = null;

        if (scoring.combinedProfileCode) {
          const [personalityKey, mindsetKey] =
            scoring.combinedProfileCode.split("_");

          const personalityMap: Record<string, string> = {
            FIRE: "A",
            FLOW: "B",
            FORM: "C",
            FIELD: "D",
          };
          const mindsetMap: Record<string, number> = {
            ORIGIN: 1,
            MOMENTUM: 2,
            VECTOR: 3,
            ORBIT: 4,
            QUANTUM: 5,
          };

          const personality_code = personalityMap[personalityKey];
          const mindset_level = mindsetMap[mindsetKey];

          if (personality_code && mindset_level) {
            const { data: qscProfileRow, error: qscProfileError } = await sb
              .from("qsc_profiles")
              .select("id")
              .eq("personality_code", personality_code)
              .eq("mindset_level", mindset_level)
              .maybeSingle();

            if (qscProfileError) {
              throw new Error(
                `QSC profile lookup failed: ${qscProfileError.message}`
              );
            }

            qscProfileId = (qscProfileRow as any)?.id ?? null;
          }
        }

        const qscPayload = {
          taker_id: taker.id,
          test_id: taker.test_id,
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
        };

        const { data: existingQsc, error: existingErr } = await sb
          .from("qsc_results")
          .select("id")
          .eq("taker_id", taker.id)
          .eq("test_id", taker.test_id)
          .eq("token", token)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingErr) {
          throw new Error(
            `QSC existing row lookup failed: ${existingErr.message}`
          );
        }

        if (existingQsc?.id) {
          const { error: qscUpdateError } = await sb
            .from("qsc_results")
            .update(qscPayload)
            .eq("id", existingQsc.id);

          if (qscUpdateError) {
            throw new Error(
              `QSC scoring failed during update: ${qscUpdateError.message}`
            );
          }
        } else {
          const { error: qscInsertError } = await sb
            .from("qsc_results")
            .insert(qscPayload);

          if (qscInsertError) {
            throw new Error(
              `QSC scoring failed during insert: ${qscInsertError.message}`
            );
          }
        }
      } catch (e: any) {
        return NextResponse.json(
          { ok: false, error: `QSC scoring failed: ${String(e?.message || e)}` },
          { status: 500 }
        );
      }
    }

    const origin = getBaseUrl();

    const reportPath = `/t/${encodeURIComponent(
      token
    )}/report?tid=${encodeURIComponent(taker.id)}`;
    const resultPath = `/t/${encodeURIComponent(
      token
    )}/result?tid=${encodeURIComponent(taker.id)}`;

    const baseReportUrl = `${origin}${reportPath}`;
    const baseResultUrl = `${origin}${resultPath}`;

    const qscGrowthPath = `/qsc/${encodeURIComponent(
      token
    )}/entrepreneur?tid=${encodeURIComponent(taker.id)}`;
    const qscLeaderPath = `/qsc/${encodeURIComponent(
      token
    )}/leader?tid=${encodeURIComponent(taker.id)}`;

    const gedSnapshotPath = `/ged/${encodeURIComponent(
      token
    )}?tid=${encodeURIComponent(taker.id)}`;
    const gedStrategicPath = `/ged/${encodeURIComponent(
      token
    )}/entrepreneur?tid=${encodeURIComponent(taker.id)}`;
    const gedExtendedPath = `/ged/${encodeURIComponent(
      token
    )}/extended?tid=${encodeURIComponent(taker.id)}`;

    const qscPublicPath = isQscEntrepreneur ? qscGrowthPath : qscLeaderPath;
    const qscPublicUrl = `${origin}${qscPublicPath}`;

    const gedPublicPath = gedStrategicPath;
    const gedPublicUrl = `${origin}${gedPublicPath}`;

    const publicReportPath = isGedTest
      ? gedPublicPath
      : isQscTest
        ? qscPublicPath
        : reportPath;

    const publicReportUrl = isGedTest
      ? gedPublicUrl
      : isQscTest
        ? qscPublicUrl
        : baseReportUrl;

    await sb
      .from("test_takers")
      .update({
        status: "completed",
        last_result_url: publicReportPath,
      })
      .eq("id", taker.id)
      .eq("link_token", token);

    const reportUrlForEmail = publicReportUrl;

    const redirectUrl: string =
      linkBehavior.show_results === true
        ? publicReportPath
        : linkBehavior.redirect_url && linkBehavior.redirect_url.trim().length
          ? linkBehavior.redirect_url.trim()
          : resultPath;

    const { data: orgRow } = await sb
      .from("orgs")
      .select("id, slug, name, support_email, notification_email, website_url")
      .eq("id", taker.org_id)
      .maybeSingle();

    const orgName =
      String((orgRow as any)?.name || (orgRow as any)?.slug || "").trim() ||
      "MindCanvas";

    const supportEmail =
      normalizeEmail((orgRow as any)?.support_email) ||
      getDefaultSupportEmail();

    const orgSlug = String((orgRow as any)?.slug || "")
      .trim()
      .toLowerCase();

    let competencyCoachGhlSyncResult: GhlSyncResult | null = null;

    const isCompetencyCoachDnaTest = slugLower === "competency-coach";

    const isCompetencyCoachQscEntrepreneur =
      orgSlug === "competency-coach" &&
      isQscTest &&
      !isGedTest &&
      qscAudience === "entrepreneur";

    if (isCompetencyCoachQscEntrepreneur) {
      competencyCoachGhlSyncResult = await syncCompetencyCoachToGhl({
        mode: "qsc_entrepreneur",
        taker,
        reportUrl: publicReportUrl,
        qscSummary,
        ccProfile: null,
        ccCoachingFlow: null,
      });

      if (!competencyCoachGhlSyncResult.ok && !competencyCoachGhlSyncResult.skipped) {
        console.error(
          "[submit] Competency Coach QSC GHL sync failed",
          competencyCoachGhlSyncResult
        );
      } else if (competencyCoachGhlSyncResult.skipped) {
        console.warn(
          "[submit] Competency Coach QSC GHL sync skipped",
          competencyCoachGhlSyncResult
        );
      }
    } else if (isCompetencyCoachDnaTest) {
      competencyCoachGhlSyncResult = await syncCompetencyCoachToGhl({
        mode: "cc_dna_blueprint",
        taker,
        reportUrl: publicReportUrl,
        qscSummary: null,
        ccProfile: topProfileLabel,
        ccCoachingFlow: topFrequencyLabel,
      });

      if (!competencyCoachGhlSyncResult.ok && !competencyCoachGhlSyncResult.skipped) {
        console.error(
          "[submit] Competency Coach DNA GHL sync failed",
          competencyCoachGhlSyncResult
        );
      } else if (competencyCoachGhlSyncResult.skipped) {
        console.warn(
          "[submit] Competency Coach DNA GHL sync skipped",
          competencyCoachGhlSyncResult
        );
      }
    }

    /*
     * The Inevitable Standard -> Genene Tekmatix/LeadConnector ring-fence.
     *
     * Configure one of:
     *   INEVITABLE_STANDARD_ALLOWED_ORG_ID=<portal.orgs.id>
     *   INEVITABLE_STANDARD_ALLOWED_ORG_SLUG=<portal.orgs.slug>
     *
     * If neither is configured, assessment submission still succeeds but the
     * Tekmatix sync is skipped.
     */
    const inevitableAllowedOrgId = normalizeText(
      process.env.INEVITABLE_STANDARD_ALLOWED_ORG_ID
    );
    const inevitableAllowedOrgSlug = normalizeSlug(
      process.env.INEVITABLE_STANDARD_ALLOWED_ORG_SLUG
    );

    const isAllowedInevitableOrg = inevitableAllowedOrgId
      ? String(taker.org_id) === inevitableAllowedOrgId
      : Boolean(
          inevitableAllowedOrgSlug &&
            orgSlug === inevitableAllowedOrgSlug
        );

    let inevitableStandardGhlSyncResult: GhlSyncResult | null = null;

    if (
      isInevitableStandardTest &&
      inevitableStandardScore &&
      isAllowedInevitableOrg
    ) {
      const completedAt = new Date().toISOString();
      const fullReportUrl = `${origin}/t/${encodeURIComponent(
        token
      )}/full-report?tid=${encodeURIComponent(taker.id)}`;

      inevitableStandardGhlSyncResult = await syncInevitableStandardToGhl({
        taker,
        testLinkName: linkAssessmentName || null,
        snapshotUrl: baseReportUrl,
        fullReportUrl,
        completedAt,
        score: inevitableStandardScore,
        constraints: inevitableStandardConstraints,
        revenueInStructure: inevitableStandardRevenue,
      });

      if (
        !inevitableStandardGhlSyncResult.ok &&
        !inevitableStandardGhlSyncResult.skipped
      ) {
        console.error(
          "[submit] Inevitable Standard Tekmatix sync failed",
          inevitableStandardGhlSyncResult
        );
      } else if (inevitableStandardGhlSyncResult.skipped) {
        console.warn(
          "[submit] Inevitable Standard Tekmatix sync skipped",
          inevitableStandardGhlSyncResult
        );
      }
    } else if (isInevitableStandardTest) {
      inevitableStandardGhlSyncResult = {
        ok: true,
        skipped: true,
        message:
          inevitableAllowedOrgId || inevitableAllowedOrgSlug
            ? "Skipped Inevitable Standard Tekmatix sync because the submission belongs to a different organisation."
            : "Skipped Inevitable Standard Tekmatix sync because INEVITABLE_STANDARD_ALLOWED_ORG_ID or INEVITABLE_STANDARD_ALLOWED_ORG_SLUG is not configured.",
      };

      console.info("[submit] Inevitable Standard Tekmatix sync ring-fenced", {
        taker_id: taker.id,
        submission_org_id: String(taker.org_id),
        submission_org_slug: orgSlug || null,
        allowed_org_id: inevitableAllowedOrgId || null,
        allowed_org_slug: inevitableAllowedOrgSlug || null,
      });
    }

    /*
     * GED -> Profiletest.ai GHL ring-fence
     *
     * A GED wrapper can be used by many organisations, so `isGedTest` alone is
     * not enough to decide whether the submission belongs in Profiletest.ai's
     * GHL account. Only sync when the submitting organisation matches the
     * configured Profiletest.ai portal organisation.
     *
     * Preferred configuration:
     *   GHL_GED_ALLOWED_ORG_ID=<portal.orgs.id for Profiletest.ai>
     *
     * Optional fallback when an ID has not been configured:
     *   GHL_GED_ALLOWED_ORG_SLUG=<portal.orgs.slug for Profiletest.ai>
     *
     * This deliberately fails closed: when neither value is configured, GED
     * submissions are still scored and reported, but none are sent to GHL.
     */
    const gedGhlAllowedOrgId = normalizeText(
      process.env.GHL_GED_ALLOWED_ORG_ID
    );
    const gedGhlAllowedOrgSlug = normalizeSlug(
      process.env.GHL_GED_ALLOWED_ORG_SLUG
    );

    const isAllowedGedGhlOrg = gedGhlAllowedOrgId
      ? String(taker.org_id) === gedGhlAllowedOrgId
      : Boolean(gedGhlAllowedOrgSlug && orgSlug === gedGhlAllowedOrgSlug);

    let ghlSyncResult: GhlSyncResult | null = null;
    if (isGedTest && isAllowedGedGhlOrg) {
      ghlSyncResult = await syncGedToGhl({
       taker,
       token,
       testName:
         linkAssessmentName ||
         normalizeText(test.name) ||
         normalizeText(meta?.assessment_name) ||
         "Growth Engine Diagnostic",
       orgId: String(taker.org_id),
       reportUrl: reportUrlForEmail,
       resultUrl: baseResultUrl,
       qscSummary,
       gedDiagnostics,
      });

      if (!ghlSyncResult.ok && !ghlSyncResult.skipped) {
        console.error("[submit] GED GHL sync failed", ghlSyncResult);
      } else if (ghlSyncResult.skipped) {
        console.warn("[submit] GED GHL sync skipped", ghlSyncResult);
      }
    } else if (isGedTest) {
      ghlSyncResult = {
        ok: true,
        skipped: true,
        message:
          gedGhlAllowedOrgId || gedGhlAllowedOrgSlug
            ? "Skipped GED GHL sync because the submission belongs to a different organisation."
            : "Skipped GED GHL sync because GHL_GED_ALLOWED_ORG_ID or GHL_GED_ALLOWED_ORG_SLUG is not configured.",
      };

      console.info("[submit] GED GHL sync ring-fenced", {
        taker_id: taker.id,
        submission_org_id: String(taker.org_id),
        submission_org_slug: orgSlug || null,
        allowed_org_id: gedGhlAllowedOrgId || null,
        allowed_org_slug: gedGhlAllowedOrgSlug || null,
      });
    }

    let takerEmailResult: any = null;
    try {
      if (linkBehavior.email_report && normalizeEmail(taker.email)) {
        takerEmailResult = await sendTemplatedEmail({
          orgId: taker.org_id,
          type: "test_taker_report",
          to: String(taker.email),
          context: {
            first_name: taker.first_name || "there",
            test_name: (test.name as string) || slug || "your assessment",
            report_link: reportUrlForEmail,
            org_name: orgName,
            support_email: supportEmail,
          },
        });

        if (!takerEmailResult?.ok) {
          console.error("[submit] test_taker_report failed", takerEmailResult);
        }
      }
    } catch (e) {
      console.error("[submit] test_taker_report unexpected error", e);
    }

    let ownerNotification: any = null;
    try {
      const sentTo =
        normalizeEmail((orgRow as any)?.notification_email) ||
        getDefaultInternalEmail();

      const firstName = (taker as any).first_name || "";
      const lastName = (taker as any).last_name || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

      if (normalizeEmail(sentTo)) {
        const internalReportLink = `${origin}/portal/${(orgRow as any)?.slug}/database/${taker.id}`;
        const internalResultsDashboardLink = `${origin}/portal/${(orgRow as any)?.slug}/dashboard?testId=${taker.test_id}`;

        ownerNotification = await sendTemplatedEmail({
          orgId: (orgRow as any)?.id || taker.org_id,
          type: "test_owner_notification",
          to: sentTo,
          context: {
            owner_first_name: "",
            owner_full_name: "",
            test_taker_full_name: fullName || (taker as any).email || "",
            test_taker_email: (taker as any).email || "",
            test_taker_mobile: (taker as any).phone || "",
            test_taker_org: (taker as any).company || "",
            test_name: (test.name as string) || slug || "your assessment",
            internal_report_link: internalReportLink,
            internal_results_dashboard_link: internalResultsDashboardLink,
            org_name: orgName,
            owner_website: (orgRow as any)?.website_url || "",
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
      rhythm: rhythmScore
        ? {
            primary_driver: rhythmScore.primaryDriver,
            secondary_driver: rhythmScore.secondaryDriver,
            ranked_drivers: rhythmScore.rankedDrivers,
            flow_drivers: rhythmScore.flowDrivers,
            stabilising_drivers: rhythmScore.stabilisingDrivers,
            frustration_drivers: rhythmScore.frustrationDrivers,
            raw_scores: rhythmScore.rawScores,
          }
        : null,
      inevitable_standard: isInevitableStandardTest
        ? {
            ghl_sync: inevitableStandardGhlSyncResult,
          }
        : null,
      ged: isGedTest
        ? {
            diagnostics: gedDiagnostics,
            ghl_sync: ghlSyncResult,
          }
        : null,
      competency_coach: competencyCoachGhlSyncResult
        ? {
            ghl_sync: competencyCoachGhlSyncResult,
            cc_profile: topProfileLabel,
            cc_coaching_flow: topFrequencyLabel,
          }
        : null,
      link: {
        show_results: linkBehavior.show_results,
        redirect_url: linkBehavior.redirect_url,
        hidden_results_message: linkBehavior.hidden_results_message,
        next_steps_url: linkBehavior.next_steps_url,
        email_report: linkBehavior.email_report,
      },
      redirect: redirectUrl,
      result_url: baseResultUrl,
      report_url: baseReportUrl,
      qsc_public_path: isQscTest && !isGedTest ? qscPublicPath : null,
      qsc_public_url: isQscTest && !isGedTest ? qscPublicUrl : null,
      ged_public_path: isGedTest ? gedPublicPath : null,
      ged_public_url: isGedTest ? gedPublicUrl : null,
      ged_snapshot_path: isGedTest ? gedSnapshotPath : null,
      ged_extended_path: isGedTest ? gedExtendedPath : null,
      owner_notification: ownerNotification,
      taker_email: takerEmailResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}