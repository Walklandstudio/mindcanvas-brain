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

/**
 * Minimal renderer: for now we show the JSON cleanly.
 * This avoids empty placeholder pages and proves the data is loading.
 */
function SectionBody({ content }: { content: any }) {
  if (content == null) {
    return <p className="text-sm text-slate-300">No content.</p>;
  }

  // If it looks like a plain string, show it nicely.
  if (typeof content === "string") {
    return <p className="text-sm text-slate-200 whitespace-pre-line">{content}</p>;
  }

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

  const sections = useMemo(() => payload?.sections ?? [], [payload]);

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
          // Special handling: if you implemented this pattern elsewhere.
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
              Loaded sections: <span className="font-semibold text-slate-100">{sectionCount}</span>
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
              The API returned ok=true but sections=[].
              This usually means the report_sections are stored against a different test_id than the one being resolved.
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
