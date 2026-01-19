// apps/web/app/qsc/[token]/strategic/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import AppBackground from "@/components/ui/AppBackground";

type ReportSection = {
  id: string;
  test_id: string | null;
  section_key: string | null;
  title: string | null;
  content: any;
  persona_code: string | null;
  order_index: number | null;
  is_active: boolean | null;
};

type ApiPayload = {
  ok: boolean;
  results?: any;
  profile?: any;
  sections?: ReportSection[];
  __debug?: any;
  error?: string;
};

function safeTitle(s: ReportSection) {
  return (s.title || "").trim() || (s.section_key || "").trim() || "Section";
}

function titleCase(s: string) {
  return s
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const PERSONALITY_LABELS: Record<string, string> = {
  FIRE: "Fire",
  FLOW: "Flow",
  FORM: "Form",
  FIELD: "Field",
};

const PERSONALITY_CODES: Record<string, string> = {
  FIRE: "A",
  FLOW: "B",
  FORM: "C",
  FIELD: "D",
};

const MINDSET_LABELS: Record<string, string> = {
  ORIGIN: "Origin",
  MOMENTUM: "Momentum",
  VECTOR: "Vector",
  ORBIT: "Orbit",
  QUANTUM: "Quantum",
};

const MINDSET_LEVELS: Record<string, string> = {
  ORIGIN: "1",
  MOMENTUM: "2",
  VECTOR: "3",
  ORBIT: "4",
  QUANTUM: "5",
};

function buildPlaceholderMap(payload: ApiPayload | null) {
  const r = payload?.results ?? {};
  const p = payload?.profile ?? {};

  const primaryPersonalityKey = String(r?.primary_personality || "").toUpperCase();
  const primaryMindsetKey = String(r?.primary_mindset || "").toUpperCase();

  const primaryPersonalityLabel =
    PERSONALITY_LABELS[primaryPersonalityKey] || titleCase(primaryPersonalityKey || "");
  const primaryPersonalityCode =
    PERSONALITY_CODES[primaryPersonalityKey] || String(p?.personality_code || "").trim();

  const primaryMindsetLabel =
    MINDSET_LABELS[primaryMindsetKey] || titleCase(primaryMindsetKey || "");
  const primaryMindsetLevel =
    MINDSET_LEVELS[primaryMindsetKey] ||
    (typeof p?.mindset_level === "number" ? String(p.mindset_level) : "");

  const combinedProfile =
    (typeof p?.profile_label === "string" && p.profile_label.trim()) ||
    (primaryPersonalityLabel && primaryMindsetLabel
      ? `${primaryPersonalityLabel} ${primaryMindsetLabel}`
      : "") ||
    (typeof r?.combined_profile_code === "string" ? r.combined_profile_code : "");

  return {
    "{{PRIMARY_PERSONALITY_LABEL}}": primaryPersonalityLabel || "—",
    "{{PRIMARY_PERSONALITY_CODE}}": primaryPersonalityCode || "—",
    "{{PRIMARY_MINDSET_LABEL}}": primaryMindsetLabel || "—",
    "{{PRIMARY_MINDSET_LEVEL}}": primaryMindsetLevel || "—",
    "{{COMBINED_PROFILE}}": combinedProfile || "—",
  };
}

function replacePlaceholdersInString(input: string, map: Record<string, string>) {
  let out = input;
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v);
  }
  return out;
}

function deepReplacePlaceholders(value: any, map: Record<string, string>): any {
  if (value == null) return value;

  if (typeof value === "string") {
    return replacePlaceholdersInString(value, map);
  }

  if (Array.isArray(value)) {
    return value.map((v) => deepReplacePlaceholders(v, map));
  }

  if (typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepReplacePlaceholders(v, map);
    }
    return out;
  }

  return value;
}

// --- TipTap-ish doc to plain text (good enough for deadline) ---
function tiptapToText(node: any): string {
  if (!node) return "";

  // blocks format (your seeded ones)
  if (node?.type === "doc" && Array.isArray(node?.blocks)) {
    return node.blocks
      .map((b: any) => {
        const t = (b?.text || "").trim();
        if (!t) return "";
        if (b?.type === "heading") return `\n${t}\n`;
        return t;
      })
      .filter(Boolean)
      .join("\n");
  }

  // tiptap format
  if (node?.type === "text") return String(node.text || "");

  const type = node?.type;
  const content = Array.isArray(node?.content) ? node.content : [];

  if (type === "paragraph") {
    const inner = content.map(tiptapToText).join("").trim();
    return inner ? `${inner}\n` : "";
  }

  if (type === "heading") {
    const inner = content.map(tiptapToText).join("").trim();
    return inner ? `\n${inner}\n` : "";
  }

  if (type === "bulletList") {
    const items = content
      .map((c: any) => tiptapToText(c).trim())
      .filter(Boolean)
      .map((s: string) =>
        s
          .split("\n")
          .map((line) => (line.trim() ? `• ${line.trim()}` : ""))
          .filter(Boolean)
          .join("\n")
      )
      .join("\n");
    return items ? `${items}\n` : "";
  }

  if (type === "orderedList") {
    let i = 1;
    const items = content
      .map((c: any) => tiptapToText(c).trim())
      .filter(Boolean)
      .map((s: string) => {
        const lines = s.split("\n").map((l) => l.trim()).filter(Boolean);
        const first = lines.shift() || "";
        const rest = lines.map((l) => `   ${l}`).join("\n");
        const head = `${i++}. ${first}`;
        return rest ? `${head}\n${rest}` : head;
      })
      .join("\n");
    return items ? `${items}\n` : "";
  }

  if (type === "listItem") {
    const inner = content.map(tiptapToText).join("").trim();
    return inner ? `${inner}\n` : "";
  }

  // default recurse
  return content.map(tiptapToText).join("");
}

function SectionBody({ content }: { content: any }) {
  if (content == null) {
    return <p className="text-sm text-slate-300">No content.</p>;
  }

  if (typeof content === "string") {
    return <p className="text-sm text-slate-200 whitespace-pre-line">{content}</p>;
  }

  // If it looks like a doc, render readable text for the deadline
  if (typeof content === "object" && content?.type === "doc") {
    const text = tiptapToText(content).trim();
    if (text) {
      return <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{text}</div>;
    }
  }

  // Fallback: show JSON (debug)
  return (
    <pre className="text-xs text-slate-200 whitespace-pre-wrap break-words">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}

export default function QscStrategicPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const searchParams = useSearchParams();
  const tid = searchParams?.get("tid") ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [payload, setPayload] = useState<ApiPayload | null>(null);

  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const apiUrl = tid
          ? `/api/public/qsc/${encodeURIComponent(token)}/strategic?tid=${encodeURIComponent(tid)}`
          : `/api/public/qsc/${encodeURIComponent(token)}/strategic`;

        const res = await fetch(apiUrl, { cache: "no-store" });

        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
        }

        const j = (await res.json()) as ApiPayload;

        if (!res.ok || j?.ok === false) {
          if (res.status === 409 && String(j?.error || "").includes("AMBIGUOUS_TOKEN_REQUIRES_TID")) {
            throw new Error(
              "This link has multiple results. Please open the Strategic report from the Snapshot (or add ?tid=...) so we can load the correct report."
            );
          }
          throw new Error(j?.error || `HTTP ${res.status}`);
        }

        if (alive) setPayload(j);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e || "Unknown error"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, tid]);

  const sections = useMemo(() => {
    const raw = payload?.sections ?? [];
    const map = buildPlaceholderMap(payload);
    return raw.map((s) => ({
      ...s,
      title: typeof s.title === "string" ? replacePlaceholdersInString(s.title, map) : s.title,
      content: deepReplacePlaceholders(s.content, map),
    }));
  }, [payload]);

  async function downloadPdf() {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(img, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(img, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`qsc-strategic-${token}.pdf`);
  }

  const snapshotHref = tid
    ? `/qsc/${encodeURIComponent(token)}?tid=${encodeURIComponent(tid)}`
    : `/qsc/${encodeURIComponent(token)}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <AppBackground />
        <main className="mx-auto max-w-6xl px-6 py-12 space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="text-3xl font-bold">Loading Strategic Growth Report…</h1>
        </main>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <AppBackground />
        <main className="mx-auto max-w-6xl px-6 py-12 space-y-4">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
            Quantum Source Code
          </p>
          <h1 className="text-3xl font-bold">Couldn&apos;t load report</h1>

          <div className="flex flex-wrap gap-2">
            <Link
              href={snapshotHref}
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium hover:bg-slate-800"
            >
              ← Back to Snapshot
            </Link>
          </div>

          <pre className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs text-slate-100 whitespace-pre-wrap">
            {err}
          </pre>
        </main>
      </div>
    );
  }

  const sectionCount = sections.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <AppBackground />
      <main ref={reportRef} className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-sky-300/80">
              Quantum Source Code
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Strategic Growth Report
            </h1>
            <p className="text-sm text-slate-300">
              Loaded sections:{" "}
              <span className="font-semibold text-slate-100">{sectionCount}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={snapshotHref}
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium hover:bg-slate-800"
            >
              ← Back to Snapshot
            </Link>
            <button
              onClick={downloadPdf}
              className="inline-flex items-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 hover:bg-slate-800"
            >
              Download PDF
            </button>
          </div>
        </header>

        {sectionCount === 0 ? (
          <section className="rounded-2xl border border-rose-800 bg-rose-950/20 p-6">
            <h2 className="text-lg font-semibold text-rose-100">No report sections found</h2>
            <p className="mt-2 text-sm text-rose-100/80">
              The API returned ok=true but sections=[]. This means report_sections aren’t being found
              for the resolved content_test_id.
            </p>
            <pre className="mt-4 text-xs text-rose-100/80 whitespace-pre-wrap">
              {JSON.stringify(payload?.__debug ?? {}, null, 2)}
            </pre>
          </section>
        ) : (
          <div className="space-y-6">
            {sections.map((s) => (
              <section
                key={s.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{safeTitle(s)}</h2>
                    {s.section_key && (
                      <p className="mt-1 text-xs text-slate-400">
                        Key: <span className="font-mono">{s.section_key}</span>
                      </p>
                    )}
                  </div>
                  {typeof s.order_index === "number" && (
                    <div className="text-xs text-slate-400">
                      Order: <span className="font-mono">{s.order_index}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <SectionBody content={s.content} />
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="pt-4 text-xs text-slate-500">
          © {new Date().getFullYear()} MindCanvas — Profiletest.ai
        </footer>
      </main>
    </div>
  );
}
