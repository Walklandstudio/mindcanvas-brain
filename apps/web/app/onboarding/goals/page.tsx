"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type GoalsData = {
  industry?: string;
  sector?: string;
  primary_goal?: string;
  align_mission?: string;
  participant_outcomes?: string;
  audience?: string;
  audience_challenges?: string;
  other_insights?: string;
  industry_info?: string;
  part_of_program?: string;
  integration_method?: string;
  pricing_mode?: string;
  price_point?: number | "";
};

const INDUSTRY_OPTIONS = [
  "Technology","Finance","Healthcare","Education","Retail","Manufacturing","Professional Services","Non-profit","Other"
];

const SECTOR_OPTIONS = [
  "B2B","B2C","Public Sector","SME","Enterprise","Startup","Internal HR/People","Sales/Revenue","Operations","Other"
];

const INTEGRATION_OPTIONS = [
  "Standalone","Embed on website","Go High Level (GHL)","HubSpot","Webhook/API","Email-only delivery","Other"
];

const PRICING_OPTIONS = ["Free","Paid","Tiered"];

export default function GoalsPage() {
  const router = useRouter();
  const [data, setData] = useState<GoalsData>({
    industry: "",
    sector: "",
    primary_goal: "",
    align_mission: "",
    participant_outcomes: "",
    audience: "",
    audience_challenges: "",
    other_insights: "",
    industry_info: "",
    part_of_program: "",
    integration_method: "",
    pricing_mode: "",
    price_point: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Load existing
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/onboarding/get?step=goals`, { cache: "no-store" });
        const json = await res.json();
        if (json?.data) setData((d) => ({ ...d, ...json.data }));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/onboarding/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "goals", data }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Saved ✓");
    } catch {
      setMsg("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const back = async () => {
    await save();
    router.push("/onboarding/branding");
  };

  const next = async () => {
    await save();
    router.push("/admin/framework");
  };

  if (loading) return <div className="p-8 text-white">Loading…</div>;

  return (
    <main className="max-w-3xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-semibold">Step 4: Profile Test Goals</h1>

      <div className="mt-6 space-y-4">
        {/* Industry */}
        <label className="block">
          <span className="block text-sm mb-1">Industry</span>
          <select
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.industry ?? ""}
            onChange={(e) => setData((d) => ({ ...d, industry: e.target.value }))}
          >
            <option value="">Choose…</option>
            {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>

        {/* Sector */}
        <label className="block">
          <span className="block text-sm mb-1">Sector</span>
          <select
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.sector ?? ""}
            onChange={(e) => setData((d) => ({ ...d, sector: e.target.value }))}
          >
            <option value="">Choose…</option>
            {SECTOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>

        {/* Primary goal */}
        <FieldText
          label="What is the primary goal of the profile test?"
          value={data.primary_goal}
          onChange={(v) => setData((d) => ({ ...d, primary_goal: v }))}
        />

        {/* Alignment */}
        <FieldText
          label="How does this test align with your company’s mission or vision?"
          value={data.align_mission}
          onChange={(v) => setData((d) => ({ ...d, align_mission: v }))}
        />

        {/* Participant outcomes */}
        <FieldText
          label="What specific outcomes would you like participants to achieve after completing the test?"
          value={data.participant_outcomes}
          onChange={(v) => setData((d) => ({ ...d, participant_outcomes: v }))}
        />

        {/* Audience */}
        <FieldText
          label="Who will primarily take this test?"
          value={data.audience}
          onChange={(v) => setData((d) => ({ ...d, audience: v }))}
        />

        {/* Audience challenges */}
        <FieldText
          label="Are there any challenges your audience faces that the test could help address?"
          value={data.audience_challenges}
          onChange={(v) => setData((d) => ({ ...d, audience_challenges: v }))}
        />

        {/* Other insights */}
        <FieldText
          label="Other insights you want to collect as part of your questions?"
          value={data.other_insights}
          onChange={(v) => setData((d) => ({ ...d, other_insights: v }))}
        />

        {/* Industry-relevant info */}
        <FieldText
          label="Industry-relevant info (revenue, targets, etc.)"
          value={data.industry_info}
          onChange={(v) => setData((d) => ({ ...d, industry_info: v }))}
        />

        {/* Part of program */}
        <FieldText
          label="Will the test be standalone or part of a larger program?"
          value={data.part_of_program}
          onChange={(v) => setData((d) => ({ ...d, part_of_program: v }))}
        />

        {/* Integration */}
        <label className="block">
          <span className="block text-sm mb-1">How would the test be integrated with your system?</span>
          <select
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.integration_method ?? ""}
            onChange={(e) => setData((d) => ({ ...d, integration_method: e.target.value }))}
          >
            <option value="">Choose…</option>
            {INTEGRATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>

        {/* Pricing */}
        <label className="block">
          <span className="block text-sm mb-1">Will the test be free, paid, or tiered?</span>
          <select
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.pricing_mode ?? ""}
            onChange={(e) => setData((d) => ({ ...d, pricing_mode: e.target.value }))}
          >
            <option value="">Choose…</option>
            {PRICING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>

        {/* Price point */}
        <label className="block">
          <span className="block text-sm mb-1">Price Point (if paid)</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="e.g., 49"
            className="w-full rounded-lg bg-white text-black p-3"
            value={data.price_point === "" ? "" : String(data.price_point)}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                price_point: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={back}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 font-medium disabled:opacity-60"
        >
          ← Back
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-white text-black font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={next}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-medium disabled:opacity-60"
        >
          Save & Next →
        </button>
        {msg && <span className="text-white/80">{msg}</span>}
      </div>
    </main>
  );
}

function FieldText({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm mb-1">{label}</span>
      <textarea
        className="w-full rounded-lg bg-white text-black p-3 min-h-[90px]"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
