"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QscMatrix } from "../../QscMatrix";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type PersonalityPercMap = Partial<Record<PersonalityKey, number>>;
type MindsetPercMap = Partial<Record<MindsetKey, number>>;

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  personality_totals: Record<string, number> | null;
  personality_percentages: PersonalityPercMap | null;
  mindset_totals: Record<string, number> | null;
  mindset_percentages: MindsetPercMap | null;
  primary_personality: PersonalityKey | null;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;
  secondary_mindset: MindsetKey | null;
  combined_profile_code: string | null;
  qsc_profile_id: string | null;
  audience: "entrepreneur" | "leader" | null;
  created_at: string;
};

type QscProfileRow = {
  id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;
  how_to_communicate: string | null;
  decision_style: string | null;
  business_challenges: string | null;
  trust_signals: string | null;
  offer_fit: string | null;
  sale_blockers: string | null;
};

type QscPersonaRow = {
  id: string;
  test_id: string;
  personality_code: string | null;
  mindset_level: number | null;
  profile_code: string | null;
  profile_label: string | null;

  show_up_summary: string | null;
  energisers: string | null;
  drains: string | null;
  communication_long: string | null;
  admired_for: string | null;
  stuck_points: string | null;

  one_page_strengths: string | null;
  one_page_risks: string | null;
  combined_strengths: string | null;
  combined_risks: string | null;
  combined_big_lever: string | null;
  emotional_stabilises: string | null;
  emotional_destabilises: string | null;
  emotional_patterns_to_watch: string | null;
  decision_style_long: string | null;
  support_yourself: string | null;
  strategic_priority_1: string | null;
  strategic_priority_2: string | null;
  strategic_priority_3: string | null;
};

type QscTakerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  role_title: string | null;
};

type QscPayload = {
  results: QscResultsRow;
  profile: QscProfileRow | null;
  persona?: QscPersonaRow | null;
  taker: QscTakerRow | null;
};

const PERSONALITY_LABELS: Record<PersonalityKey, string> = {
  FIRE: "Fire",
  FLOW: "Flow",
  FORM: "Form",
  FIELD: "Field",
};

const MINDSET_LABELS: Record<MindsetKey, string> = {
  ORIGIN: "Origin",
  MOMENTUM: "Momentum",
  VECTOR: "Vector",
  ORBIT: "Orbit",
  QUANTUM: "Quantum",
};

function normalisePercent(raw: number | undefined | null): number {
  if (raw == null || !Number.isFinite(raw)) return 0;
  if (raw > 0 && raw <= 1.5) {
    return Math.min(100, Math.max(0, raw * 100));
  }
  return Math.min(100, Math.max(0, raw));
}

type FrequencyDonutDatum = {
  key: PersonalityKey;
  label: string;
  value: number;
};

const FREQUENCY_COLORS: Record<PersonalityKey, string> = {
  FIRE: "#f97316",
  FLOW: "#0ea5e9",
  FORM: "#22c55e",
  FIELD: "#a855f7",
};

function FrequencyDonut({ data }: { data: FrequencyDonutDatum[] }) {
  const total =
    data.reduce((sum, d) => sum + (isFinite(d.value) ? d.value : 0), 0) || 1;

  const radius = 60;
  const strokeWidth = 20;
  const center = 80;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <svg
      viewBox="0 0 160 160"
      className="h-40 w-40 md:h-48 md:w-48"
      aria-hidden="true"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke="rgba(15,23,42,0.9)"
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {data.map((d) => {
        const fraction = (isFinite(d.value) ? d.value : 0) / total;
        const dash = circumference * fraction;
        const dashArray = `${dash} ${circumference}`;
        const strokeDashoffset = offset;
        offset -= dash;
        return (
          <circle
            key={d.key}
            cx={center}
            cy={center}
            r={radius}
            stroke={FREQUENCY_COLORS[d.key]}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={dashArray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={center} cy={center} r={radius - strokeWidth} fill="#020617" />
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        className="text-[9px] md:text-[10px]"
        fill="#e5e7eb"
        style={{
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        LEADERSHIP
      </text>
      <text
        x={center}
        y={center + 10}
        textAnchor="middle"
        className="text-[9px] md:text-[10px]"
        fill="#e5e7eb"
        style={{
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        FREQUENCY
      </text>
    </svg>
  );
}

function derivePrimarySecondary<K extends string>(
  perc: Partial<Record<K, number>>,
  keys: readonly K[]
): { primary: K | null; secondary: K | null } {
  const entries = keys.map((k) => ({
    key: k,
    value: normalisePercent(perc[k] ?? 0),
  }));
  entries.sort((a, b) => b.value - a.value);
  const primary = entries[0] && entries[0].value > 0 ? entries[0].key : null;
  const secondary =
    entries[1] && entries[1].value > 0 ? entries[1].key : null;
  return { primary, secondary };
}

export default function QscLeaderStrategicReportPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<QscPayload | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(
          `/api/public/qsc/${encodeURIComponent(token)}/result`,
          { cache: "no-store" }
        );

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(
            `Non-JSON response (${res.status}): ${text.slice(0, 200)}`
          );
        }

        const j = (await res.json()) as {
          ok?: boolean;
          error?: string;
          results?: QscResultsRow;
          profile?: QscProfileRow | null;
          persona?: QscPersonaRow | null;
          taker?: QscTakerRow | null;
        };

        if (!res.ok || j.ok === false) {
          throw new Error(j.error || `HTTP ${res.status}`);
        }

        if (alive && j.results) {
          setPayload({
            results: j.results,
            profile: j.profile ?? null,
            persona: j.persona ?? null,
            taker: j.taker ?? null,
          });
        }
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e || "Unknown error"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const result = payload?.results ?? null;
  const profile = payload?.profile ?? null;
  const persona = payload?.persona ?? null;
  const taker = payload?.taker ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <main className="mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-700">
            Strategic Leadership Report
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Preparing your QSC Leaders report…
          </h1>
        </main>
      </div>
    );
  }

  if (err || !result) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <main className="mx-auto max-w-5xl px-4 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-700">
            Strategic Leadership Report
          </p>
          <h1 className="text-3xl font-bold">Couldn&apos;t load report</h1>
          <p className="text-sm text-slate-700">
            We weren&apos;t able to generate your QSC Leaders — Strategic
            Leadership Report.
          </p>
          <pre className="mt-2 rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 whitespace-pre-wrap">
            {err || "No data"}
          </pre>
        </main>
      </div>
    );
  }

  const createdAt = new Date(result.created_at);
  const personaName =
    persona?.profile_label ||
    profile?.profile_label ||
    "Your Quantum Leadership Profile";

  const takerDisplayName =
    taker &&
    ([taker.first_name, taker.last_name].filter(Boolean).join(" ") ||
      taker.email ||
      null);

  const backHref = tid
    ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}`;

  const rawPersonalityPerc =
    (result.personality_percentages ?? {}) as PersonalityPercMap;
  const rawMindsetPerc =
    (result.mindset_percentages ?? {}) as MindsetPercMap;

  const personalityPerc: PersonalityPercMap = {
    FIRE: normalisePercent(rawPersonalityPerc.FIRE ?? 0),
    FLOW: normalisePercent(rawPersonalityPerc.FLOW ?? 0),
    FORM: normalisePercent(rawPersonalityPerc.FORM ?? 0),
    FIELD: normalisePercent(rawPersonalityPerc.FIELD ?? 0),
  };

  const mindsetPerc: MindsetPercMap = {
    ORIGIN: normalisePercent(rawMindsetPerc.ORIGIN ?? 0),
    MOMENTUM: normalisePercent(rawMindsetPerc.MOMENTUM ?? 0),
    VECTOR: normalisePercent(rawMindsetPerc.VECTOR ?? 0),
    ORBIT: normalisePercent(rawMindsetPerc.ORBIT ?? 0),
    QUANTUM: normalisePercent(rawMindsetPerc.QUANTUM ?? 0),
  };

  const frequencyDonutData: FrequencyDonutDatum[] = ([
    "FIRE",
    "FLOW",
    "FORM",
    "FIELD",
  ] as PersonalityKey[]).map((key) => ({
    key,
    label: PERSONALITY_LABELS[key],
    value: personalityPerc[key] ?? 0,
  }));

  const personalityKeys: PersonalityKey[] = ["FIRE", "FLOW", "FORM", "FIELD"];
  const mindsetKeys: MindsetKey[] = [
    "ORIGIN",
    "MOMENTUM",
    "VECTOR",
    "ORBIT",
    "QUANTUM",
  ];

  const {
    primary: derivedPrimaryPersonality,
    secondary: derivedSecondaryPersonality,
  } = derivePrimarySecondary(personalityPerc, personalityKeys);

  const {
    primary: derivedPrimaryMindset,
    secondary: derivedSecondaryMindset,
  } = derivePrimarySecondary(mindsetPerc, mindsetKeys);

  const effectivePrimaryPersonality: PersonalityKey | null =
    derivedPrimaryPersonality ?? result.primary_personality ?? null;
  const effectiveSecondaryPersonality: PersonalityKey | null =
    derivedSecondaryPersonality ?? result.secondary_personality ?? null;

  const effectivePrimaryMindset: MindsetKey | null =
    derivedPrimaryMindset ?? result.primary_mindset ?? null;
  const effectiveSecondaryMindset: MindsetKey | null =
    derivedSecondaryMindset ?? result.secondary_mindset ?? null;

  const primaryPersonalityLabel =
    (effectivePrimaryPersonality &&
      PERSONALITY_LABELS[effectivePrimaryPersonality]) ||
    effectivePrimaryPersonality ||
    "—";

  const primaryMindsetLabel =
    (effectivePrimaryMindset && MINDSET_LABELS[effectivePrimaryMindset]) ||
    effectivePrimaryMindset ||
    "—";

  const onePageStrengths = persona?.one_page_strengths || "—";
  const onePageRisks = persona?.one_page_risks || "—";
  const combinedStrengths = persona?.combined_strengths || "—";
  const combinedRisks = persona?.combined_risks || "—";
  const combinedLever = persona?.combined_big_lever || "—";
  const emotionalStabilises = persona?.emotional_stabilises || "—";
  const emotionalDestabilises = persona?.emotional_destabilises || "—";
  const emotionalPatterns = persona?.emotional_patterns_to_watch || "—";
  const decisionStyleLong =
    persona?.decision_style_long || profile?.decision_style || "—";
  const supportYourself = persona?.support_yourself || "—";

  const strategic1 = persona?.strategic_priority_1 || "—";
  const strategic2 = persona?.strategic_priority_2 || "—";
  const strategic3 = persona?.strategic_priority_3 || "—";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto max-w-5xl px-4 py-10 md:py-12 space-y-10">
        {/* HEADER */}
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-700">
              Strategic Leadership Report
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              QSC Leaders — Strategic Leadership Report
            </h1>
            {takerDisplayName && (
              <p className="mt-1 text-sm text-slate-700">
                For:{" "}
                <span className="font-semibold">{takerDisplayName}</span>
              </p>
            )}
            <p className="mt-2 text-sm text-slate-700 max-w-2xl">
              Your personal emotional, leadership and strategic blueprint –
              based on your Quantum leadership profile and current mindset
              stage.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs text-slate-600">
            <Link
              href={backHref}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              ← Back to Snapshot
            </Link>
            <span>
              Created at{" "}
              {createdAt.toLocaleString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </header>

        {/* From here down you can keep the same sections as the Entrepreneur
            report (One-page Summary, Frequency, Mindset, Matrix, Personality
            layer, Mindset layer, Combined pattern, Emotional support,
            Strategic priorities), since the content is all being driven by the
            Leaders personas & profiles in Supabase. */}
        {/* You can paste the remaining JSX blocks from the Entrepreneur page
            here unchanged to avoid duplication in this message. */}
      </main>
    </div>
  );
}
