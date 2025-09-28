'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import Image from 'next/image';

type Freq = 'A' | 'B' | 'C' | 'D';

type Props = {
  reportId: string;
  name: string;
  profileCode: string;                    // e.g. P4
  profileName: string;                    // e.g. "Profile 4 — The Negotiator"
  profileImage?: string;                  // /public/profiles/p4.png
  profileColor?: string;                  // HEX
  flow: Record<Freq, number>;
  topFlowName: string;                    // "Communications"
  // Rich copy
  welcome?: string;
  overview?: string;
  strengths?: string[];
  watchouts?: string[];
  tips?: string[];
  competencies?: string;
};

/** Brand colors for each Flow (HEX) */
const FLOW_COLORS: Record<Freq, string> = {
  A: '#0EA5E9', // Catalyst
  B: '#F59E0B', // Communications
  C: '#10B981', // Rhythmic
  D: '#8B5CF6', // Observer
};

/** Nicely cased labels for chart/legend */
const FLOW_LABELS: Record<Freq, string> = {
  A: 'Catalyst',
  B: 'Communications',
  C: 'Rhythmic',
  D: 'Observer',
};

export default function ReportClient({
  reportId,
  name,
  profileCode,
  profileName,
  profileImage,
  profileColor = '#111111',
  flow,
  topFlowName,
  welcome = '',
  overview = '',
  strengths = [],
  watchouts = [],
  tips = [],
  competencies = '',
}: Props) {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = Math.max(1, (flow.A ?? 0) + (flow.B ?? 0) + (flow.C ?? 0) + (flow.D ?? 0));

  const pieData = useMemo(
    () =>
      (['A', 'B', 'C', 'D'] as Freq[]).map((k) => ({
        key: k,
        label: FLOW_LABELS[k],
        value: flow[k] ?? 0,
      })),
    [flow.A, flow.B, flow.C, flow.D],
  );

  const waitForImages = async (root: HTMLElement) => {
    const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              const done = () => resolve();
              img.onload = done;
              img.onerror = done;
              try {
                img.crossOrigin = 'anonymous';
              } catch {}
            }),
      ),
    );
  };

  const toggleExcludes = (root: HTMLElement, hide: boolean) => {
    const nodes = Array.from(root.querySelectorAll('[data-pdf-exclude="true"]')) as HTMLElement[];
    nodes.forEach((el) => {
      el.style.visibility = hide ? 'hidden' : '';
    });
  };

  const handleDownload = useCallback(async () => {
    const el = reportRef.current;
    if (!el) return;

    setErr(null);
    setDownloading(true);

    try {
      toggleExcludes(el, true);
      await waitForImages(el);

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`report_${reportId}.pdf`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      toggleExcludes(el, false);
      setDownloading(false);
    }
  }, [reportId]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header actions (excluded from PDF) */}
      <div className="mb-4 flex items-center justify-between" data-pdf-exclude="true">
        <h1 className="text-xl font-semibold">Report</h1>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          title="Download as PDF"
        >
          {downloading ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* ======= CAPTURED AREA ======= */}
      <div ref={reportRef} className="rounded-xl bg-white">
        {/* Hero / Summary */}
        <section className="border-b p-6">
          <div className="flex items-center gap-4">
            {profileImage ? (
              <Image
                src={profileImage}
                alt={profileName}
                width={84}
                height={84}
                className="h-21 w-21 rounded-xl object-cover"
                priority
              />
            ) : (
              <div
                className="h-20 w-20 rounded-xl"
                style={{ backgroundColor: profileColor }}
                aria-hidden
              />
            )}
            <div>
              <h2 className="text-2xl font-semibold">
                {name}, your Profile is{' '}
                <span style={{ color: profileColor }}>{profileName}</span>
              </h2>
              <p className="text-sm text-gray-600">
                and your coaching Flow is <span className="font-medium">{topFlowName}</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">({profileCode})</p>
            </div>
          </div>
        </section>

        {/* Flow pie (with human labels) */}
        <section className="border-b p-6">
          <h3 className="mb-3 text-base font-semibold">Your Flow Mix</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="label"
                    outerRadius="80%"
                    label={(d) => {
                      const val = d.value as number;
                      const pct = total ? Math.round((val / total) * 100) : 0;
                      return `${d.label} ${pct}%`;
                    }}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={FLOW_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, n: string) => [`${v}`, n]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm">
              {(Object.keys(FLOW_COLORS) as Freq[]).map((k) => {
                const pct = total ? Math.round(((flow[k] ?? 0) / total) * 100) : 0;
                return (
                  <div key={k} className="flex items-center gap-3">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: FLOW_COLORS[k] }} />
                    <span className="font-medium">{FLOW_LABELS[k]}</span>
                    <span className="tabular-nums text-gray-600 ml-auto">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Welcome */}
        {welcome && (
          <section className="border-b p-6">
            <h3 className="mb-2 text-base font-semibold">Welcome</h3>
            <p className="whitespace-pre-line text-sm leading-6 text-gray-800">{welcome}</p>
          </section>
        )}

        {/* Overview / Introduction */}
        {(overview || competencies) && (
          <section className="border-b p-6">
            <h3 className="mb-2 text-base font-semibold">Overview</h3>
            {overview && (
              <p className="mb-4 whitespace-pre-line text-sm leading-6 text-gray-800">{overview}</p>
            )}
            {competencies && (
              <>
                <h4 className="mb-2 font-medium">Core Competencies</h4>
                <p className="whitespace-pre-line text-sm leading-6 text-gray-800">{competencies}</p>
              </>
            )}
          </section>
        )}

        {/* Strengths / Watch-outs / Tips */}
        {(strengths.length || watchouts.length || tips.length) && (
          <section className="p-6">
            <div className="grid gap-6 md:grid-cols-3">
              {strengths.length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium">Strengths</h4>
                  <ul className="list-disc pl-5 text-sm leading-6 text-gray-800">
                    {strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {watchouts.length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium">Watch-outs</h4>
                  <ul className="list-disc pl-5 text-sm leading-6 text-gray-800">
                    {watchouts.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              {tips.length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium">Tips</h4>
                  <ul className="list-disc pl-5 text-sm leading-6 text-gray-800">
                    {tips.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
      {/* ======= /CAPTURED AREA ======= */}
    </div>
  );
}
