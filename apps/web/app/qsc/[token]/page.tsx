"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { QscMatrix } from "../QscMatrix";

type PersonalityKey = "FIRE" | "FLOW" | "FORM" | "FIELD";
type MindsetKey = "ORIGIN" | "MOMENTUM" | "VECTOR" | "ORBIT" | "QUANTUM";

type PersonalityPercMap = Partial<Record<PersonalityKey, number>>;
type MindsetPercMap = Partial<Record<MindsetKey, number>>;

type QscResultsRow = {
  id: string;
  test_id: string;
  token: string;
  audience: "entrepreneur" | "leader";
  personality_totals: Record<string, number> | null;
  personality_percentages: PersonalityPercMap | null;
  mindset_totals: Record<string, number> | null;
  mindset_percentages: MindsetPercMap | null;
  primary_personality: PersonalityKey | null;
  secondary_personality: PersonalityKey | null;
  primary_mindset: MindsetKey | null;
  secondary_mindset: MindsetKey | null;
  combined_profile_code: string | null;
  created_at: string;
};

type ApiPayload = {
  ok: boolean;
  results: QscResultsRow;
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

function normalisePercent(raw?: number | null): number {
  if (!raw || !Number.isFinite(raw)) return 0;
  return raw <= 1 ? raw * 100 : raw;
}

export default function QscSnapshotPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";

  const [data, setData] = useState<QscResultsRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const snapshotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = tid
          ? `/api/public/qsc/${token}/result?tid=${tid}`
          : `/api/public/qsc/${token}/result`;

        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as ApiPayload;

        if (!res.ok || !json.ok) {
          throw new Error("Failed to load QSC snapshot");
        }

        setData(json.results);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, tid]);

  const personalityPerc = useMemo(() => {
    const p = data?.personality_percentages ?? {};
    return {
      FIRE: normalisePercent(p.FIRE),
      FLOW: normalisePercent(p.FLOW),
      FORM: normalisePercent(p.FORM),
      FIELD: normalisePercent(p.FIELD),
    };
  }, [data]);

  const mindsetPerc = useMemo(() => {
    const m = data?.mindset_percentages ?? {};
    return {
      ORIGIN: normalisePercent(m.ORIGIN),
      MOMENTUM: normalisePercent(m.MOMENTUM),
      VECTOR: normalisePercent(m.VECTOR),
      ORBIT: normalisePercent(m.ORBIT),
      QUANTUM: normalisePercent(m.QUANTUM),
    };
  }, [data]);

  async function downloadPdf() {
    if (!snapshotRef.current) return;
    const canvas = await html2canvas(snapshotRef.current, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(img, "PNG", 0, 0, 210, 297);
    pdf.save(`qsc-snapshot-${token}.pdf`);
  }

  if (loading) return <div className="p-10">Loading snapshot…</div>;
  if (error || !data) return <div className="p-10 text-red-600">{error}</div>;

  const strategicHref =
    data.audience === "leader"
      ? `/qsc/${token}/leader${tid ? `?tid=${tid}` : ""}`
      : `/qsc/${token}/entrepreneur${tid ? `?tid=${tid}` : ""}`;

  return (
    <div className="min-h-screen bg-slate-100">
      <main
        ref={snapshotRef}
        className="mx-auto max-w-5xl px-6 py-10 space-y-10"
      >
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Your Buyer Persona Snapshot</h1>
            <p className="text-sm text-slate-600">
              Quantum Source Code Overview
            </p>
          </div>
          <button
            onClick={downloadPdf}
            className="rounded-lg border px-3 py-1.5 text-xs bg-white"
          >
            Download PDF
          </button>
        </header>

        <section className="grid grid-cols-2 gap-6">
          {Object.entries(personalityPerc).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white p-4 border">
              <div className="text-sm font-semibold">
                {PERSONALITY_LABELS[k as PersonalityKey]}
              </div>
              <div className="text-2xl font-bold">{Math.round(v)}%</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-5 gap-4">
          {Object.entries(mindsetPerc).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white p-3 border text-center">
              <div className="text-xs">{MINDSET_LABELS[k as MindsetKey]}</div>
              <div className="font-bold">{Math.round(v)}%</div>
            </div>
          ))}
        </section>

        <section className="rounded-xl bg-white border p-6">
          <h2 className="font-semibold mb-3">Persona Matrix</h2>
          <QscMatrix
            primaryPersonality={data.primary_personality}
            primaryMindset={data.primary_mindset}
          />
        </section>

        <footer className="flex justify-end">
          <Link
            href={strategicHref}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm"
          >
            View Strategic Report →
          </Link>
        </footer>
      </main>
    </div>
  );
}
