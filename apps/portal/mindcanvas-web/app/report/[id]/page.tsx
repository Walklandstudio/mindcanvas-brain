// app/report/[id]/page.tsx
import 'server-only';
import React from 'react';
import { headers } from 'next/headers';
import ReportViz, { ResultPayload } from './ReportViz';

type Params = { id: string };

interface ResultApiResponse {
  submissionId: string;
  result: ResultPayload;
}

function buildBaseUrl(h: Headers): string {
  // On Vercel/Prod you'll have x-forwarded-proto/host; locally default to http://localhost:3000
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

async function fetchResult(submissionId: string): Promise<ResultPayload | null> {
  const h = await headers();
  const base = buildBaseUrl(h);
  const res = await fetch(`${base}/api/submissions/${submissionId}/result`, {
    // This is a server component request; no cookies needed
    method: 'GET',
    // Ensure fresh on SSR when navigating directly
    cache: 'no-store',
  });

  if (!res.ok) {
    // If result route isn’t implemented, you can switch to calling /api/submissions/[id]/finish
    return null;
  }

  const data = (await res.json()) as ResultApiResponse;
  if (!data?.result) return null;
  return data.result;
}

export default async function ReportPage(props: { params: Promise<Params> }) {
  const { id } = await props.params;

  // Pull the computed result for visuals
  const result = await fetchResult(id);

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-8">
      {/* Hero */}
      <section className="rounded-2xl border p-6 shadow-sm bg-white">
        <h1 className="text-2xl md:text-3xl font-bold">
          Your Competency Coach Profile Report
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          Submission ID: <span className="font-mono">{id}</span>
        </p>
      </section>

      {/* Visuals */}
      <section className="rounded-2xl border p-6 shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>

        {!result ? (
          <div className="text-sm text-red-600">
            We couldn’t load your results yet. If you just finished the test, refresh in a moment.
          </div>
        ) : (
          <ReportViz result={result} />
        )}
      </section>

      {/* Download / actions (hooked up to your PdfButton if present) */}
      <section className="rounded-2xl border p-6 shadow-sm bg-white">
        <div className="flex flex-wrap items-center gap-3">
          {/* If you have a PdfButton component that expects a ref/selector, render it here */}
          {/* <PdfButton /> */}
          <a
            href={`/api/submissions/${id}/result`}
            className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            View raw JSON
          </a>
        </div>
      </section>
    </main>
  );
}


