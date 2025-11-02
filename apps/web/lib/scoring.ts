// apps/web/lib/scoring.ts

export type AB = "A" | "B" | "C" | "D";

export type AnswerOption = {
  profile?: string; // e.g., "P1", "PROFILE_1", "The Innovator"
  frequency?: AB;   // optional: if provided on the option
  points?: number;  // weight/score for this option
};

export type AnswerRow = {
  options?: AnswerOption[];
  selected?: number;       // index into options
  selected_index?: number; // alt name some UIs use
  // tolerant fallbacks:
  selectedOption?: AnswerOption;
  value?: { profile?: string; points?: number };
};

export type AnswersJSON = AnswerRow[];

// If your org-specific profile label JSON exposes frequency per profile, pass it in.
// Example (Team Puzzle sample):
// [{code:"PROFILE_1", name:"Visionary", frequency:"A"}, ...]
export type ProfileLabel = { code: string; name: string; frequency?: AB };

const CC_PROFILE_TO_FREQ: Record<string, AB> = {
  // Competency Coach mapping (Signature)
  P1: "A", // The Innovator -> Catalyst
  P2: "A", // The Storyteller -> Catalyst
  P3: "B", // The Heart-Centered -> Communicator
  P4: "B", // The Negotiator -> Communicator
  P5: "C", // The Grounded Guide -> Rhythmic
  P6: "C", // The Thinker -> Rhythmic
  P7: "D", // The Mastermind -> Observer
  P8: "D", // The Change Agent -> Observer
};

function normalizeProfileCode(raw?: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Normalize common forms:
  // "PROFILE_1" -> "P1"; "1" -> "P1"; keep "P1" as "P1".
  const m = s.match(/(\d+)/);
  if (/^P\d+$/i.test(s)) return s.toUpperCase();
  if (/^PROFILE[_\s-]?(\d+)$/i.test(s)) return `P${RegExp.$1}`;
  if (m && !isNaN(Number(m[1]))) return `P${m[1]}`;
  return s; // fallback to name or custom code
}

function profileToFrequency(
  codeOrName: string,
  orgSlug: string,
  labels?: ProfileLabel[]
): AB | null {
  const code = normalizeProfileCode(codeOrName);

  // 1) Team Puzzle (or any org) — if labels provide frequency, prefer that.
  if (labels && labels.length) {
    // try code exact
    const byCode = labels.find(
      (p) => normalizeProfileCode(p.code) === code || p.code === codeOrName
    );
    if (byCode?.frequency) return byCode.frequency;
    // try by name
    const byName = labels.find((p) => p.name === codeOrName);
    if (byName?.frequency) return byName.frequency;
  }

  // 2) Competency Coach (known mapping)
  if (orgSlug === "competency-coach" && code && CC_PROFILE_TO_FREQ[code]) {
    return CC_PROFILE_TO_FREQ[code];
  }

  // 3) Heuristic: first letter A|B|C|D
  const first = String(codeOrName)[0]?.toUpperCase();
  if (first === "A" || first === "B" || first === "C" || first === "D") {
    return first as AB;
  }

  return null;
}

export function scoreAnswers(
  answers: AnswersJSON,
  orgSlug: string,
  profileLabels?: ProfileLabel[]
): {
  profile_totals: Record<string, number>;
  frequency_totals: Record<AB, number>;
} {
  const profile_totals: Record<string, number> = {};
  const frequency_totals: Record<AB, number> = { A: 0, B: 0, C: 0, D: 0 };

  const rows: AnswerRow[] = Array.isArray(answers) ? answers : [];

  for (const row of rows) {
    // Case 1: options[] with selected index
    if (Array.isArray(row.options) && (row.selected != null || row.selected_index != null)) {
      const idx = Number(row.selected ?? row.selected_index);
      const opt = row.options[idx];
      if (opt) {
        const pts = Number(opt.points ?? 0) || 0;
        const code = normalizeProfileCode(opt.profile || "");
        if (code && pts) {
          profile_totals[code] = (profile_totals[code] || 0) + pts;
          const freq = opt.frequency || profileToFrequency(code, orgSlug, profileLabels || []);
          if (freq) frequency_totals[freq] += pts;
        }
      }
      continue;
    }

    // Case 2: selectedOption object
    if (row.selectedOption) {
      const opt = row.selectedOption;
      const pts = Number(opt.points ?? 0) || 0;
      const code = normalizeProfileCode(opt.profile || "");
      if (code && pts) {
        profile_totals[code] = (profile_totals[code] || 0) + pts;
        const freq = opt.frequency || profileToFrequency(code, orgSlug, profileLabels || []);
        if (freq) frequency_totals[freq] += pts;
      }
      continue;
    }

    // Case 3: value object
    if (row.value) {
      const pts = Number((row.value as any).points ?? 0) || 0;
      const code = normalizeProfileCode((row.value as any).profile || "");
      if (code && pts) {
        profile_totals[code] = (profile_totals[code] || 0) + pts;
        const freq = profileToFrequency(code, orgSlug, profileLabels || []);
        if (freq) frequency_totals[freq] += pts;
      }
      continue;
    }
  }

  return { profile_totals, frequency_totals };
}
