"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import type {
  InsiderFounderWord,
  InsiderInsightsReport,
  InsiderPillarSnapshot,
  InsiderSequenceStep,
} from "@/lib/inevitable-standard/buildInsiderInsightsReport";
import {
  GOLD,
  HAIRLINE,
  INK,
  NAVY_DEEP,
  ReadinessDonut,
  newsreader,
  round1,
  serif,
} from "@/app/t/[token]/report/inevitableStandardShared";
import PrintButton from "@/app/t/[token]/report/PrintButton";

const FIGMA = {
  page: "#041731",
  navy: "#14263d",
  navy2: "#1f2c46",
  panel: "#edeff2",
  ivory: "#f8f6f1",
  gold: "#b89a5e",
  goldLight: "#c9b98f",
  body: "#66727d",
  hairline: "#d6dae0",
  border: "#ddd4bd",
  green: "#4c7a5b",
  amber: "#bd8b3d",
  red: "#a8503f",
};

const GAR_TONE = {
  GREEN: { colour: FIGMA.green, bg: "#e2ebe0", risk: "LOW RISK" },
  AMBER: { colour: FIGMA.amber, bg: "#f1e5cc", risk: "MEDIUM RISK" },
  RED: { colour: FIGMA.red, bg: "#f1ddd6", risk: "HIGH RISK" },
} as const;

function formatMoney(value: number, currency: string): string {
  const code = (currency || "USD").trim().toUpperCase();

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${code} ${Math.round(value).toLocaleString()}`;
  }
}

function formatCustomerValues(
  low: number | null,
  high: number | null,
): string | null {
  if (low == null || high == null) return null;

  const format = (value: number) =>
    Number.isInteger(value) ? String(value) : String(value);

  return low === high
    ? format(low)
    : `${format(low)}-${format(high)}`;
}

const PILLAR_ICON: Record<InsiderPillarSnapshot["key"], string> = {
  identity: "/inevitable-standard/snapshot/identitiy.png",
  positioning: "/inevitable-standard/snapshot/positioning.png",
  offer: "/inevitable-standard/snapshot/offer.png",
  sales: "/inevitable-standard/snapshot/sales.png",
  revenue_model: "/inevitable-standard/snapshot/revenue-model.png",
  decision: "/inevitable-standard/snapshot/decision.png",
};

const SIGNAL_ICON: Record<string, string> = {
  "How they think": "/inevitable-standard/insider-insights/Brain.png",
  "How they decide": "/inevitable-standard/insider-insights/Stopwatch.png",
  "How they buy": "/inevitable-standard/insider-insights/Buy.png",
  "What builds trust": "/inevitable-standard/insider-insights/Guarantee.png",
  "What reduces trust": "/inevitable-standard/insider-insights/Cancel.png",
  "Best communication style": "/inevitable-standard/insider-insights/Solve.png",
  "Likely objection": "/inevitable-standard/insider-insights/Error.png",
  "What may really be underneath it": "/inevitable-standard/insider-insights/Search.png",
  "Buying signals": "/inevitable-standard/insider-insights/Flag.png",
  "Resistance signals": "/inevitable-standard/insider-insights/Refresh.png",
  "What to challenge": "/inevitable-standard/insider-insights/Challange.png",
  "What not to assume": "/inevitable-standard/insider-insights/Eye.png",
  "Coaching style": "/inevitable-standard/insider-insights/Clipboard%20List.png",
};

const INDEX_ITEMS = [
  { id: "snapshot", label: "Insider snapshot" },
  { id: "predictive-signals", label: "Predictive signals at a glance" },
  { id: "founders-words", label: "Founder's own words" },
  { id: "suggested-sequence", label: "Suggested sequence" },
  { id: "objective", label: "The Objective" },
] as const;

const TAG_LABEL_TONE: Record<
  InsiderFounderWord["tags"][number]["kind"],
  string
> = {
  "HYPOTHESIS TO VALIDATE": "#b3893f",
  "LISTEN FOR": "#b3893f",
  "DO NOT ASSUME": "#a8503f",
  "GREEN LEVERAGE": "#4c7a5b",
};

function SectionShell({
  id,
  eyebrow,
  children,
}: {
  id: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-[20px] p-[27px] print:p-4"
      style={{ backgroundColor: FIGMA.navy }}
    >
      <p
        className="text-[14px] font-semibold uppercase tracking-[0.18em] sm:text-[16px]"
        style={{ color: FIGMA.gold }}
      >
        {eyebrow}
      </p>
      <div
        className="mt-[26px] rounded-[20px] p-6 sm:p-10 print:mt-4 print:p-6"
        style={{ backgroundColor: FIGMA.panel }}
      >
        {children}
      </div>
    </section>
  );
}

function RiskChip({ pillar }: { pillar: InsiderPillarSnapshot }) {
  const tone = GAR_TONE[pillar.gar];
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]"
      style={{ backgroundColor: tone.bg, color: tone.colour }}
    >
      {round1(pillar.percentage)}% · {tone.risk}
    </span>
  );
}

function HeroPillars({ pillars }: { pillars: InsiderPillarSnapshot[] }) {
  return (
    <div className="rounded-[10px] border border-white/15 bg-white/[0.05] px-7 py-5">
      <p className="mb-4 text-[10px] uppercase tracking-[0.16em] text-[#a9a08a]">
        The six pillars
      </p>
      <div className="space-y-[13px]">
        {pillars.map((pillar) => {
          const tone = GAR_TONE[pillar.gar];
          return (
            <div
              key={pillar.key}
              className="grid grid-cols-[105px_1fr_34px] items-center gap-3"
            >
              <div className="flex items-center gap-2">
                <img
                  src={PILLAR_ICON[pillar.key]}
                  alt=""
                  className="h-6 w-6 object-contain"
                />
                <span className="text-[11px] text-[#cfc9b8]">
                  {pillar.key === "revenue_model" ? "Rev. Model" : pillar.label}
                </span>
              </div>
              <div className="h-[6px] overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pillar.percentage}%`,
                    backgroundColor: tone.colour,
                  }}
                />
              </div>
              <span className="text-right text-[11px] font-bold text-[#f0ece0]">
                {round1(pillar.percentage)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PillarStrip({ pillars }: { pillars: InsiderPillarSnapshot[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 print:grid-cols-6">
      {pillars.map((pillar) => {
        const tone = GAR_TONE[pillar.gar];
        return (
          <div
            key={pillar.key}
            className="rounded-[6px] border-t-2 px-3 pb-2 pt-3"
            style={{
              borderColor: tone.colour,
              backgroundColor: `${tone.colour}24`,
            }}
          >
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#14263d]">
              {pillar.label}
            </p>
            <p className="mt-1 text-[21px]" style={{ ...serif, color: FIGMA.navy }}>
              {round1(pillar.percentage)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function QuickReferenceRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="grid gap-2 py-3.5 sm:grid-cols-[220px_1fr] sm:items-center"
      style={{
        borderBottom: last ? undefined : `1px dashed ${FIGMA.border}`,
      }}
    >
      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#736c5c]">
        {label}
      </dt>
      <dd className="text-[14px] leading-6 text-[#26241d]">{children}</dd>
    </div>
  );
}

function EvidenceStrip({ pillars }: { pillars: InsiderPillarSnapshot[] }) {
  if (pillars.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
      {pillars.map((pillar) => {
        const tone = GAR_TONE[pillar.gar];
        return (
          <div
            key={pillar.key}
            className="rounded-[10px] border-t-2 bg-white px-4 py-4"
            style={{ borderColor: tone.colour }}
          >
            <p className="text-[8px] uppercase tracking-[0.1em] text-[#66727d]">
              {pillar.label}
            </p>
            <p className="mt-2 text-[16px]" style={{ ...serif, color: FIGMA.navy }}>
              {pillar.garLabel} {round1(pillar.percentage)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function FounderWord({ item }: { item: InsiderFounderWord }) {
  return (
    <div className="space-y-[18px]">
      <div className="rounded-[15px] p-7" style={{ backgroundColor: FIGMA.ivory }}>
        <p
          className="text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{ color: FIGMA.gold }}
        >
          Founder&apos;s own words · Question {item.questionNumber}
        </p>
        <blockquote
          className="mt-3 text-[20px] leading-8 sm:text-[21px]"
          style={{ ...serif, color: FIGMA.navy }}
        >
          “{item.quote}”
        </blockquote>
      </div>

      <EvidenceStrip pillars={item.evidencePillars} />

      {item.tags.length > 0 ? (
        <div
          className="rounded-[6px] border bg-white px-7 py-6"
          style={{ borderColor: FIGMA.border }}
        >
          <div className="space-y-5">
            {item.tags.map((tag) => (
              <div key={tag.kind}>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.08em]"
                  style={{ color: TAG_LABEL_TONE[tag.kind] }}
                >
                  {tag.kind}
                </p>
                <p className="mt-2 text-[14px] leading-6 text-[#66727d]">
                  {tag.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {item.riskSignal ? (
        <div className="rounded-[15px] p-7" style={{ backgroundColor: FIGMA.ivory }}>
          <span className="inline-block bg-[#8a4a3d] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
            Risk signal
          </span>
          <p className="mt-3 text-[13px] leading-6 text-[#66727d]">
            {item.riskSignal.text}
          </p>
          {item.riskSignal.adviserResponse ? (
            <p className="mt-3 text-[12px] leading-5 text-[#8a4a3d]">
              Adviser response: {item.riskSignal.adviserResponse}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SequenceStep({ step }: { step: InsiderSequenceStep }) {
  return (
    <div
      className="grid grid-cols-[48px_1fr] gap-5 border-b py-5 last:border-b-0"
      style={{ borderColor: FIGMA.hairline }}
    >
      <span
        className="text-[30px] leading-none"
        style={{ ...serif, color: FIGMA.gold }}
      >
        {String(step.step).padStart(2, "0")}
      </span>
      <div>
        <h3 className="text-[17px] capitalize" style={{ ...serif, color: FIGMA.navy }}>
          {step.title}
        </h3>
        <p className="mt-2 text-[12px] leading-5 text-[#14263d]">
          {step.instruction}
        </p>
        {step.example ? (
          <p
            className="mt-3 text-[14px] italic leading-6 text-[#1e3550]"
            style={serif}
          >
            “{step.example}”
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function InsiderInsightsReportClient({
  report,
  backHref,
  nextStepsHref,
}: {
  report: InsiderInsightsReport;
  backHref: string;
  nextStepsHref: string | null;
}) {
  const {
    meta,
    snapshot,
    commercialContext,
    revenueInStructure,
  } = report;
  const [activeSection, setActiveSection] = useState<string>("snapshot");

  const indexItems = useMemo(
    () =>
      INDEX_ITEMS.filter((item) => {
        if (item.id === "founders-words") return report.foundersWords.length > 0;
        if (item.id === "predictive-signals") return report.predictiveSignals.length > 0;
        if (item.id === "objective") return Boolean(report.objective);
        return true;
      }),
    [report],
  );

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const elements = indexItems
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -65% 0px", threshold: [0, 0.25, 0.6, 1] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [indexItems]);

  const completedLabel = meta.generatedAt
    ? new Date(meta.generatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const secondaryText = snapshot.secondaryApproach
    ? snapshot.secondaryApproach.percentage != null
      ? `${snapshot.secondaryApproach.label} — ${round1(snapshot.secondaryApproach.percentage)}%`
      : snapshot.secondaryApproach.label
    : "—";

  return (
    <main
      className={`${newsreader.variable} min-h-screen`}
      style={{ backgroundColor: FIGMA.page, color: INK }}
    >
      {/* Keep platform/help overlays out of generated PDFs. */}
      <style>{`
        @media print {
          @page { margin: 0; }
          html, body { background: #041731 !important; }
          body .fixed,
          body [style*="position: fixed"],
          body [style*="position:fixed"],
          body [aria-label*="chat" i],
          body .intercom-lightweight-app,
          body .crisp-client {
            display: none !important;
          }
        }
      `}</style>

      {/* Approved Figma top bar */}
      <header
        className="border-b border-white/10 px-5 py-4 text-white print:hidden"
        style={{ backgroundColor: FIGMA.navy }}
      >
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4">
          <Link href={backHref} className="mr-auto flex min-w-[330px] items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
              <img
                src="/images/profile-test-ai-logo.png"
                alt="profiletest.ai"
                className="max-h-8 max-w-8 object-contain brightness-0 invert"
              />
            </div>
            <div>
              <p className="text-[18px] font-semibold uppercase tracking-[0.14em] sm:text-[24px]">
                Insider Insights
              </p>
              <p
                className="mt-1 text-[9px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: FIGMA.goldLight }}
              >
                The Inevitable Standard Method™ · Powered By profiletest-ai
              </p>
            </div>
          </Link>

          <PrintButton className="rounded-lg bg-[#b89a5e] px-5 py-2 text-[12px] font-semibold text-white">
            Download PDF
          </PrintButton>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-[18px] border border-white/30 px-4 py-2">
              <span className="block text-white/40">Prepared for</span>
              <strong className="mt-1 block text-[12px] text-white">Coaches</strong>
            </div>
            <div className="rounded-[18px] border border-white/30 px-4 py-2">
              <span className="block text-white/40">Date</span>
              <strong className="mt-1 block text-[12px] text-white">{completedLabel}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Approved Figma hero */}
      <section className="bg-gradient-to-b from-[#14263d] to-[#1f2c46] px-6 py-[60px] text-white sm:px-10">
        <div className="mx-auto grid max-w-[1275px] gap-8 xl:grid-cols-[1fr_676px] print:grid-cols-[minmax(0,1fr)_520px] print:gap-5">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em]" style={{ color: FIGMA.gold }}>
              The Inevitable Standard Method™
            </p>
            <h1 className="mt-6 text-[52px] leading-[0.98] sm:text-[68px] xl:text-[80px]" style={serif}>
              Insider Insights
            </h1>
            <p
              className="mt-5 text-[24px] italic sm:text-[30px]"
              style={{ ...serif, color: FIGMA.goldLight }}
            >
              Predictive Selling &amp; Coaching Playbook
            </p>
            <div className="mt-8 border-t border-[#b89a5e]/45 pt-3 text-[11px] uppercase tracking-[0.2em]">
              Prepared for {meta.taker.fullName}
            </div>
            <p className="mt-5 max-w-[660px] text-[11px] leading-[18px] text-[#8e9aaa]">
              This document is prepared for the adviser, coach or consultant conducting
              the commercial conversation. It is not supplied to the test taker. It
              contains interpretation and hypotheses, not conclusions.
            </p>
          </div>

          <div>
            <div className="grid gap-6 sm:grid-cols-[263px_1fr] print:grid-cols-[190px_1fr] print:gap-4">
              <div className="flex flex-col items-center rounded-[10px] border border-white/15 bg-white/[0.05] px-5 py-4">
                <p className="text-center text-[10px] uppercase tracking-[0.14em] text-[#a9a08a]">
                  Inevitable Standard Readiness
                </p>
                <ReadinessDonut
                  percentage={snapshot.readinessPercentage}
                  band={snapshot.readinessLabel ?? ""}
                />
                <p className="text-center text-[13px] text-[#e8e2d0]">
                  {snapshot.readinessLabel || "Current result"}{" "}
                  <span className="text-[#cfc9b8]">· Current standard</span>
                </p>
              </div>
              <HeroPillars pillars={snapshot.pillars} />
            </div>
            <div className="mt-8 flex justify-end">
              <span className="bg-[#a85b55] px-7 py-5 text-[11px] uppercase tracking-[0.22em] text-white">
                Internal use only
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1275px] gap-[46px] px-5 py-14 lg:grid-cols-[303px_minmax(0,963px)]">
        {/* Approved Figma sidebar */}
        <aside className="print:hidden">
          <div
            className="sticky top-5 rounded-[20px] border border-white/10 p-[18px]"
            style={{ backgroundColor: FIGMA.ivory }}
          >
            <p className="mb-4 text-[11px] uppercase tracking-[0.24em] text-[#33445a]">
              Report Index
            </p>
            <nav className="space-y-2">
              {indexItems.map((item, index) => {
                const active = item.id === activeSection;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    aria-current={active ? "true" : undefined}
                    className="block rounded-[15px] border px-4 py-3 text-[12px] leading-5 transition"
                    style={
                      active
                        ? {
                            backgroundColor: "#33445a",
                            borderColor: "#33445a",
                            color: "#fff",
                          }
                        : { borderColor: "#33445a", color: "#33445a" }
                    }
                  >
                    {index + 1}. {item.label}
                  </a>
                );
              })}
            </nav>
            <PrintButton className="mt-3 w-full rounded-[10px] bg-[#33445a] px-4 py-3 text-[12px] font-semibold text-white">
              Download PDF
            </PrintButton>
            <a
              href={nextStepsHref || "#suggested-sequence"}
              className="mt-2 block w-full rounded-[10px] bg-gradient-to-r from-[#5a7a9e] via-[#2563c8] to-[#14263d] px-4 py-3 text-center text-[12px] font-semibold text-white"
            >
              Next step
            </a>
          </div>
        </aside>

        <div className="space-y-10">
          {/* 1. Quick reference */}
          <SectionShell id="snapshot" eyebrow="Quick Reference">
            <h2 className="text-[29px]" style={{ ...serif, color: FIGMA.navy }}>
              Insider snapshot
            </h2>

            <dl
              className="mt-7 rounded-[10px] border bg-white px-7 py-6"
              style={{ borderColor: FIGMA.border }}
            >
              <QuickReferenceRow label="Client">
                <strong className="text-[#182238]">{meta.taker.fullName}</strong>
                <span className="block">
                  {[meta.taker.company, completedLabel && `Completed ${completedLabel}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </QuickReferenceRow>

              <QuickReferenceRow label="Primary Decision Approach">
                {snapshot.primaryApproach.label} — {round1(snapshot.primaryApproach.percentage)}%
              </QuickReferenceRow>

              <QuickReferenceRow label="Secondary Influence">
                {secondaryText}
              </QuickReferenceRow>

              <QuickReferenceRow label="Overall Readiness">
                {round1(snapshot.readinessPercentage)}% — {snapshot.readinessLabel || "—"}
              </QuickReferenceRow>

              <QuickReferenceRow label="Primary Constraint">
                {snapshot.primaryConstraint ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {snapshot.primaryConstraint.label}
                    <RiskChip pillar={snapshot.primaryConstraint} />
                  </span>
                ) : (
                  "—"
                )}
              </QuickReferenceRow>

              <QuickReferenceRow label="Secondary Constraint">
                {snapshot.secondaryConstraint ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {snapshot.secondaryConstraint.label}
                    <RiskChip pillar={snapshot.secondaryConstraint} />
                  </span>
                ) : (
                  "—"
                )}
              </QuickReferenceRow>

              <QuickReferenceRow label="Strongest Pillar">
                {snapshot.strongestPillar ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {snapshot.strongestPillar.label}
                    <RiskChip pillar={snapshot.strongestPillar} />
                  </span>
                ) : (
                  "—"
                )}
              </QuickReferenceRow>

              <QuickReferenceRow label="Possible False Constraint">
                {snapshot.falseConstraint?.label || "None flagged"}
              </QuickReferenceRow>

              <QuickReferenceRow label="Priority Fix Order" last>
                {snapshot.priorityOrder.map((item) => item.label).join(" → ")}
              </QuickReferenceRow>
            </dl>

            <div className="mt-7 grid gap-4 xl:grid-cols-2 print:grid-cols-2">
              <div
                className="rounded-[12px] border bg-white p-6"
                style={{ borderColor: FIGMA.border }}
              >
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: FIGMA.gold }}
                >
                  Commercial context - {commercialContext.timeframeMonths}-month view
                </p>

                <h3
                  className="mt-2 text-[23px]"
                  style={{ ...serif, color: FIGMA.navy }}
                >
                  Commercial baseline
                </h3>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 print:grid-cols-3">
                  <div className="rounded-[9px] bg-[#f8f6f1] p-4">
                    <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#736c5c]">
                      Revenue baseline
                    </p>
                    <p className="mt-2 text-[17px] font-semibold text-[#182238]">
                      {commercialContext.revenueBand
                        ? `${commercialContext.currency} ${commercialContext.revenueBand}`
                        : "—"}
                    </p>
                    <p className="mt-1 text-[9px] leading-4 text-[#66727d]">
                      Reported for the last {commercialContext.timeframeMonths} months
                    </p>
                  </div>

                  <div className="rounded-[9px] bg-[#f8f6f1] p-4">
                    <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#736c5c]">
                      Buying opportunities
                    </p>
                    <p className="mt-2 text-[17px] font-semibold text-[#182238]">
                      {commercialContext.monthlyOpportunityBand
                        ? `${commercialContext.monthlyOpportunityBand} / month`
                        : "—"}
                    </p>
                    <p className="mt-1 text-[9px] leading-4 text-[#66727d]">
                      Meaningful opportunities reaching a buying point
                    </p>
                  </div>

                  <div className="rounded-[9px] bg-[#f8f6f1] p-4">
                    <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#736c5c]">
                      Typical customer value
                    </p>
                    <p className="mt-2 text-[17px] font-semibold text-[#182238]">
                      {commercialContext.initialCustomerValueBand
                        ? `${commercialContext.currency} ${commercialContext.initialCustomerValueBand}`
                        : "—"}
                    </p>
                    <p className="mt-1 text-[9px] leading-4 text-[#66727d]">
                      Initial value when a customer first buys
                    </p>
                  </div>
                </div>

                {commercialContext.twelveMonthPriority ? (
                  <div
                    className="mt-4 rounded-[9px] border-l-4 px-5 py-4"
                    style={{
                      borderColor: FIGMA.gold,
                      backgroundColor: FIGMA.ivory,
                    }}
                  >
                    <p
                      className="text-[8px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: FIGMA.gold }}
                    >
                      Founder priority - next {commercialContext.timeframeMonths} months
                    </p>
                    <p className="mt-2 text-[13px] leading-5 text-[#33445a]">
                      {commercialContext.twelveMonthPriority}
                    </p>
                  </div>
                ) : null}
              </div>

              <div
                className="rounded-[12px] border p-6"
                style={{
                  borderColor: "#8a7952",
                  backgroundColor: FIGMA.ivory,
                }}
              >
                <p
                  className="text-[9px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: FIGMA.gold }}
                >
                  Revenue in your structure
                </p>

                <h3
                  className="mt-2 text-[23px]"
                  style={{ ...serif, color: FIGMA.navy }}
                >
                  Modelled commercial value - 12-month view
                </h3>

                {revenueInStructure ? (
                  <>
                    {revenueInStructure.needsRevenueConfirmation ? (
                      <div className="mt-5 rounded-[9px] bg-[#f1e5cc] p-5">
                        <p className="text-[17px] font-semibold text-[#8a6426]">
                          Revenue confirmation needed
                        </p>
                        <p className="mt-2 text-[11px] leading-5 text-[#66727d]">
                          The reported revenue band is open-ended. Confirm an
                          approximate revenue figure before using a modelled
                          commercial-value range.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p
                          className="mt-5 text-[32px] leading-tight sm:text-[36px]"
                          style={{ ...serif, color: FIGMA.navy }}
                        >
                          {formatMoney(
                            revenueInStructure.rangeLow,
                            revenueInStructure.currency,
                          )}{" "}
                          -{" "}
                          {formatMoney(
                            revenueInStructure.rangeHigh,
                            revenueInStructure.currency,
                          )}
                        </p>

                        <p className="mt-2 text-[11px] leading-5 text-[#66727d]">
                          Potential commercial value associated with the current
                          structure over a {revenueInStructure.timeframeMonths}-month
                          view.
                        </p>
                      </>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-[9px] bg-white p-4">
                        <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#736c5c]">
                          Primary constraint
                        </p>
                        <p className="mt-2 text-[14px] font-semibold text-[#182238]">
                          {revenueInStructure.primaryConstraintLabel || "—"}
                        </p>
                      </div>

                      <div className="rounded-[9px] bg-white p-4">
                        <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#736c5c]">
                          Confidence
                        </p>
                        <p className="mt-2 text-[14px] font-semibold text-[#182238]">
                          {revenueInStructure.confidenceLabel || "—"}
                        </p>
                      </div>
                    </div>

                    {formatCustomerValues(
                      revenueInStructure.customerValuesLow,
                      revenueInStructure.customerValuesHigh,
                    ) ? (
                      <div className="mt-3 rounded-[9px] bg-white p-4">
                        <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#736c5c]">
                          Equivalent scale
                        </p>
                        <p className="mt-2 text-[14px] font-semibold text-[#182238]">
                          Approximately{" "}
                          {formatCustomerValues(
                            revenueInStructure.customerValuesLow,
                            revenueInStructure.customerValuesHigh,
                          )}{" "}
                          typical customer values
                        </p>
                      </div>
                    ) : null}

                    {revenueInStructure.disclaimer ? (
                      <p className="mt-4 text-[8px] leading-[13px] text-[#8a8f95]">
                        {revenueInStructure.disclaimer}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-5 text-[12px] leading-5 text-[#66727d]">
                    A modelled commercial-value range is not available for this result.
                    The commercial baseline above can still be used in the conversation.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-7">
              <PillarStrip pillars={snapshot.pillars} />
            </div>
          </SectionShell>

          {/* 2. Predictive signals */}
          {report.predictiveSignals.length > 0 ? (
            <SectionShell id="predictive-signals" eyebrow="Before the Conversation">
              <h2 className="text-[29px]" style={{ ...serif, color: FIGMA.navy }}>
                Predictive signals at a glance
              </h2>
              <div className="mt-6 grid bg-white md:grid-cols-2 print:grid-cols-2">
                {report.predictiveSignals.map((row, index) => {
                  const last = index === report.predictiveSignals.length - 1;
                  return (
                    <div
                      key={row.label}
                      className={`border-b px-5 py-4 ${last ? "md:col-span-2 print:col-span-2" : ""}`}
                      style={{ borderColor: FIGMA.hairline }}
                    >
                      <div className="flex items-center gap-3">
                        {SIGNAL_ICON[row.label] ? (
                          <img
                            src={SIGNAL_ICON[row.label]}
                            alt=""
                            className="h-[22px] w-[22px] object-contain"
                          />
                        ) : null}
                        <p
                          className="text-[9px] font-semibold uppercase tracking-[0.14em]"
                          style={{ color: FIGMA.gold }}
                        >
                          {row.label}
                        </p>
                      </div>
                      <p className="mt-2 text-[12px] leading-[18px] text-[#14263d]">
                        {row.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionShell>
          ) : null}

          {/* 3. Founder's own words */}
          {report.foundersWords.length > 0 ? (
            <SectionShell id="founders-words" eyebrow="Diagnostic Interpretation">
              <h2 className="text-[29px]" style={{ ...serif, color: FIGMA.navy }}>
                Founder&apos;s own words
              </h2>
              <div className="mt-6 space-y-8">
                {report.foundersWords.map((item) => (
                  <FounderWord key={item.questionNumber} item={item} />
                ))}
              </div>
            </SectionShell>
          ) : null}

          {/* 4. Suggested sequence */}
          <SectionShell id="suggested-sequence" eyebrow="In the Conversation">
            <h2 className="text-[29px]" style={{ ...serif, color: FIGMA.navy }}>
              Suggested sequence
            </h2>
            {report.sequenceIntro ? (
              <p className="mt-3 text-[14px] leading-6 text-[#66727d]">
                {report.sequenceIntro}
              </p>
            ) : null}

            <div className="mt-5 border-t" style={{ borderColor: FIGMA.hairline }}>
              {report.suggestedSequence.map((step) => (
                <SequenceStep key={step.step} step={step} />
              ))}
            </div>

            {report.sequenceCaution ? (
              <div className="mt-6 rounded-[10px] border-l-2 bg-white px-6 py-5" style={{ borderColor: FIGMA.red }}>
                <span className="inline-block bg-[#a85b55] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                  Do not assume
                </span>
                <p className="mt-3 text-[12px] leading-5 text-[#14263d]">
                  {report.sequenceCaution}
                </p>
              </div>
            ) : null}
          </SectionShell>

          {/* 5. Objective */}
          {report.objective ? (
            <section
              id="objective"
              className="scroll-mt-6 rounded-[20px] bg-gradient-to-r from-[#14263d] to-[#1f2c46] px-8 py-12 text-center text-white shadow-xl print:py-8"
            >
              <p
                className="text-[15px] font-medium uppercase tracking-[0.18em]"
                style={{ color: FIGMA.gold }}
              >
                The Objective
              </p>
              <h2 className="mt-5 text-[27px]" style={serif}>
                What this conversation needs to achieve
              </h2>
              <p className="mt-3 text-[11px] text-[#8e9aaa]">
                Everything else in this playbook is optional. If the conversation
                achieves only one thing, it should be this.
              </p>
              <div
                className="mx-auto mt-8 max-w-[715px] rounded-[15px] border-2 px-8 py-9"
                style={{ borderColor: FIGMA.gold }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: FIGMA.gold }}
                >
                  The one thing this conversation needs to achieve
                </p>
                <p className="mt-4 text-[23px] leading-8 sm:text-[25px]" style={serif}>
                  {report.objective}
                </p>
              </div>
            </section>
          ) : null}

          <footer className="pb-4 text-[11px] text-[#8e9aaa] print:hidden">
            Content source: {meta.sourceVersion}.
            {report.qaFlags.length > 0 ? (
              <details className="mt-2">
                <summary className="cursor-pointer">
                  Diagnostic notes ({report.qaFlags.length})
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {report.qaFlags.map((flag, index) => (
                    <li key={index}>{flag}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </footer>
        </div>
      </div>
    </main>
  );
}
