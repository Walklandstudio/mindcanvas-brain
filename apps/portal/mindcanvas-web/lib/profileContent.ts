// lib/profileContent.ts

// ===== Types =====
export type FlowKey = "A" | "B" | "R" | "O"; // Catalyst, Communications, Rhythmic, Observer
export type ProfileKey = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8";

export interface ProfileContent {
  code: ProfileKey;
  name: string;
  flows: FlowKey[];              // dominant → supporting
  overview: string;              // 1–2 line summary for hero/welcome
  strengths: string[];           // bullet points
  challenges: string[];          // bullet points
  idealEnvironments: string[];   // where this coach thrives
  idealClients: string[];        // best-fit client types
  growthPlan: string[];          // actionable next steps
  examples?: string[];           // notable exemplars (optional)
}

// ===== Canonical names (no abbreviations) =====
export const FLOW_NAMES: Record<FlowKey, string> = {
  A: "Catalyst Coaching Flow",
  B: "Communications Coaching Flow",
  R: "Rhythmic Coaching Flow",
  O: "Observer Coaching Flow",
};

export const PROFILE_NAMES: Record<ProfileKey, string> = {
  P1: "The Innovator",
  P2: "The Storyteller",
  P3: "The Heart-Centred Coach",
  P4: "The Negotiator",
  P5: "The Grounded Guide",
  P6: "The Thinker",
  P7: "The Mastermind",
  P8: "The Change Agent",
};

export function flowLongName(key: FlowKey) {
  return FLOW_NAMES[key];
}
export function profileLongName(code: ProfileKey) {
  return PROFILE_NAMES[code];
}

// ===== Rich content mapped from your PDFs =====
// Notes:
// - Overviews for all eight profiles reflect the “Eight Coaching Profiles” sections in your PDFs,
//   and the deeper bullets for P6–P8 are distilled from their dedicated chapters. :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4} :contentReference[oaicite:5]{index=5}
export const PROFILE_CONTENT: Record<ProfileKey, ProfileContent> = {
  // P1 — Innovator (Catalyst)
  P1: {
    code: "P1",
    name: PROFILE_NAMES.P1,
    flows: ["A"],
    overview:
      "A bold, disruption-driven coach who pushes for rapid breakthroughs and action.",
    strengths: [
      "High energy and momentum; challenges the status quo",
      "Inspires decisive movement and rapid change",
    ],
    challenges: [
      "May move too fast and underweight longer-term stability",
      "Benefits from pairing inspiration with structure and follow-through",
    ],
    idealEnvironments: [
      "High-intensity transformations",
      "Entrepreneurial or scale-up contexts",
    ],
    idealClients: [
      "Founders and leaders seeking fast change",
      "Individuals needing a push beyond comfort zones",
    ],
    growthPlan: [
      "Balance speed with simple, repeatable routines",
      "Define 30-60-90 outcomes to anchor momentum",
      "Add light governance to sustain wins after big pushes",
    ],
  },

  // P2 — Storyteller (Catalyst–Communications)
  P2: {
    code: "P2",
    name: PROFILE_NAMES.P2,
    flows: ["A", "B"],
    overview:
      "A narrative-led coach who shifts perspectives and sparks action through compelling communication.",
    strengths: [
      "Charismatic, emotionally engaging",
      "Reframes challenges via story and dialogue",
    ],
    challenges: [
      "Inspiration may outpace concrete execution",
      "Needs clear action steps and accountability cadence",
    ],
    idealEnvironments: [
      "Leadership development and brand/story work",
      "Change programs needing high engagement",
    ],
    idealClients: [
      "Execs and creators refining voice and influence",
      "Teams needing alignment through narrative",
    ],
    growthPlan: [
      "Attach every story to a measurable outcome",
      "Use weekly scorecards to track follow-through",
      "Blend workshops with practice reps and feedback",
    ],
  },

  // P3 — Heart-Centred Coach (Communications)
  P3: {
    code: "P3",
    name: PROFILE_NAMES.P3,
    flows: ["B"],
    overview:
      "An empathy-first coach who builds deep trust and facilitates inner growth and alignment.",
    strengths: [
      "Compassionate, emotionally intelligent presence",
      "Creates safety for meaningful, personal change",
    ],
    challenges: [
      "Can absorb too much emotional weight",
      "Benefits from boundaries and structured outcomes",
    ],
    idealEnvironments: [
      "Purpose/values alignment work",
      "Culture and wellbeing programs",
    ],
    idealClients: [
      "Leaders seeking clarity of purpose",
      "Individuals navigating identity or transitions",
    ],
    growthPlan: [
      "Define session contracts and limits up front",
      "Tie reflection to specific behavior shifts",
      "Introduce light metrics for progress and momentum",
    ],
  },

  // P4 — Negotiator (Communications–Rhythmic)
  P4: {
    code: "P4",
    name: PROFILE_NAMES.P4,
    flows: ["B", "R"],
    overview:
      "A diplomatic coach who resolves complexity, builds harmony, and moves groups forward together.",
    strengths: [
      "Balances perspectives and navigates conflict",
      "Fosters collaboration and durable agreements",
    ],
    challenges: [
      "May hesitate on tough calls",
      "Needs assertive decision frameworks when stakes are high",
    ],
    idealEnvironments: [
      "Executive and team coaching",
      "Cross-functional initiatives and mediation",
    ],
    idealClients: [
      "Leadership teams with competing priorities",
      "Organizations seeking cohesion and clarity",
    ],
    growthPlan: [
      "Use decision matrices to reach timely calls",
      "Set escalation paths for unresolved issues",
      "Document agreements as operating principles",
    ],
  },

  // P5 — Grounded Guide (Rhythmic)
  P5: {
    code: "P5",
    name: PROFILE_NAMES.P5,
    flows: ["R"],
    overview:
      "A structure-first coach who drives steady progress with practical systems and accountability.",
    strengths: [
      "Reliable, process-driven, detail-aware",
      "Installs routines that compound results",
    ],
    challenges: [
      "May resist change or ambiguity",
      "Benefits from adaptability tools during volatility",
    ],
    idealEnvironments: [
      "Operational excellence and habit formation",
      "Long-horizon implementation programs",
    ],
    idealClients: [
      "Managers needing consistency",
      "Teams building execution muscle",
    ],
    growthPlan: [
      "Introduce ‘change windows’ for iteration",
      "Run monthly retros to prune processes",
      "Track lead/lag indicators in simple dashboards",
    ],
  },

  // P6 — Thinker (Rhythmic–Observer)
  P6: {
    code: "P6",
    name: PROFILE_NAMES.P6,
    flows: ["R", "O"],
    overview:
      "A strategic, analytical coach who brings clarity through research, logic and structured problem-solving.", // :contentReference[oaicite:6]{index=6}
    strengths: [
      "Data-driven decisions and risk awareness",
      "Plans that translate complexity into clear action", // :contentReference[oaicite:7]{index=7}
    ],
    challenges: [
      "Can over-analyze and slow execution",
      "Needs to balance certainty with timely action", // :contentReference[oaicite:8]{index=8}
    ],
    idealEnvironments: [
      "Strategy, finance, and systems-based coaching",
      "Structured organizations with measurable goals", // :contentReference[oaicite:9]{index=9}
    ],
    idealClients: [
      "CEOs/executives seeking clear frameworks",
      "Analysts and teams needing evidence-based plans", // :contentReference[oaicite:10]{index=10}
    ],
    growthPlan: [
      "Adopt ‘good-enough’ decision thresholds",
      "Pair research sprints with execution sprints",
      "Instrument progress with lightweight metrics", // :contentReference[oaicite:11]{index=11}
    ],
    examples: ["Benjamin Graham", "Elon Musk", "Seth Godin", "Michael Gerber"], // :contentReference[oaicite:12]{index=12}
  },

  // P7 — Mastermind (Observer)
  P7: {
    code: "P7",
    name: PROFILE_NAMES.P7,
    flows: ["O"],
    overview:
      "A long-range strategist who architects scalable systems and sustainable success.", // :contentReference[oaicite:13]{index=13}
    strengths: [
      "Future-focused, structured, systems thinker",
      "Excels at resource allocation and risk mitigation", // :contentReference[oaicite:14]{index=14}
    ],
    challenges: [
      "May over-control; delegation and flexibility are growth edges", // :contentReference[oaicite:15]{index=15}
      "Can over-plan without timely execution",
    ],
    idealEnvironments: [
      "Business strategy, operations, and executive advisory",
      "Programs needing scale and governance", // :contentReference[oaicite:16]{index=16}
    ],
    idealClients: [
      "CEOs and senior leaders",
      "Strategy and finance professionals", // :contentReference[oaicite:17]{index=17}
    ],
    growthPlan: [
      "Design decision rights and delegate clearly",
      "Blend roadmaps with fast feedback loops",
      "Track outcomes with objective scorecards", // :contentReference[oaicite:18]{index=18}
    ],
    examples: ["Steve Jobs", "Larry Page & Sergey Brin", "Christine Lagarde", "Bill Gates"], // :contentReference[oaicite:19]{index=19}
  },

  // P8 — Change Agent (Observer–Catalyst)
  P8: {
    code: "P8",
    name: PROFILE_NAMES.P8,
    flows: ["O", "A"],
    overview:
      "A precision coach who optimizes systems, engineers efficiency, and drives continuous improvement.", // :contentReference[oaicite:20]{index=20}
    strengths: [
      "Process optimization and measurable performance",
      "Meticulous planning and iterative refinement", // :contentReference[oaicite:21]{index=21}
    ],
    challenges: [
      "Can be rigid or perfection-prone; needs adaptability",
      "Must balance technical focus with human connection", // :contentReference[oaicite:22]{index=22}
    ],
    idealEnvironments: [
      "Operations, workflow design, and technology programs",
      "Performance-driven transformations", // :contentReference[oaicite:23]{index=23}
    ],
    idealClients: [
      "CEOs/execs improving efficiency",
      "Tech and systems leaders optimizing processes", // :contentReference[oaicite:24]{index=24}
    ],
    growthPlan: [
      "Couple standards with flexibility guardrails",
      "Use OKRs/KPIs to track continuous improvement",
      "Schedule ‘innovation sprints’ to test refinements", // :contentReference[oaicite:25]{index=25}
    ],
    examples: ["Jeff Bezos", "Mark Zuckerberg", "Elon Musk", "Sam Walton"], // :contentReference[oaicite:26]{index=26}
  },
};

// ===== Lookup API (code or full name) =====
/**
 * Fetch rich profile content by code ('P1'...'P8') or by full name ('The Innovator', etc.).
 * Default selector is 'code'.
 */
export function getProfileContent(
  keyOrName: string,
  selector: "code" | "name" = "code"
): ProfileContent {
  const byCode = selector === "code";
  if (byCode) {
    const code = keyOrName.toUpperCase() as ProfileKey;
    const hit = PROFILE_CONTENT[code];
    if (!hit) throw new Error(`Unknown profile code: ${keyOrName}`);
    return hit;
  }
  // selector === 'name'
  const entry = (Object.values(PROFILE_CONTENT) as ProfileContent[]).find(
    (p) => p.name.toLowerCase() === keyOrName.toLowerCase()
  );
  if (!entry) throw new Error(`Unknown profile name: ${keyOrName}`);
  return entry;
}
