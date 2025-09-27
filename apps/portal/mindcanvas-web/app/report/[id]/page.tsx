// app/report/[id]/page.tsx
import 'server-only';
import React from 'react';
import { headers } from 'next/headers';
import ReportViz, { ResultPayload, ProfileCode, FlowLabel } from './ReportViz';

type Params = { id: string };

interface ResultApiResponse {
  submissionId: string;
  result: ResultPayload | null;
}

interface ProfileRow {
  code: ProfileCode;
  name: string;
  flow: FlowLabel | string;
  overview: string | null;
  strengths: string[] | null;
  watchouts: string[] | null;
  tips: string[] | null;
  welcome_long: string | null;
  introduction_long: string | null;
  competencies_long: string | null;
  brand_color: string | null;
  image_url: string | null;
}

function baseUrl(h: Headers) {
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

async function fetchResult(id: string): Promise<ResultPayload | null> {
  const h = await headers();
  const res = await fetch(`${baseUrl(h)}/api/submissions/${id}/result`, { cache: 'no-store' });
  if (!res.ok) return null;
  const j = (await res.json()) as ResultApiResponse;
  return j.result ?? null;
}

async function fetchProfile(code: ProfileCode): Promise<ProfileRow | null> {
  const h = await headers();
  const res = await fetch(`${baseUrl(h)}/api/profiles/${code}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as ProfileRow;
}

export default async function ReportPage(props: { params: Promise<Params> }) {
  const { id } = await props.params;
  const result = await fetchResult(id);

  let mainProfile: ProfileRow | null = null;
  if (result) {
    mainProfile = await fetchProfile(result.winner.profileCode);
  }

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
        {mainProfile && (
          <div className="mt-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {mainProfile.image_url ? (
              <img
                alt={mainProfile.name}
                src={mainProfile.image_url}
                className="h-16 w-16 rounded-xl object-contain border"
              />
            ) : null}
            <div>
              <div className="text-lg font-semibold" style={{ color: mainProfile.brand_color ?? undefined }}>
                {mainProfile.name}
              </div>
              <div className="text-xs text-gray-600">Flow: {String(mainProfile.flow)}</div>
            </div>
          </div>
        )}
      </section>

      {/* Visuals */}
      <section className="rounded-2xl border p-6 shadow-sm bg-white">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        {!result ? (
          <div className="text-sm text-red-600">
            No computed results yet. Finish the test to generate your report.
          </div>
        ) : (
          <ReportViz result={result} />
        )}
      </section>

      {/* Narrative / Long-form copy */}
      {mainProfile && (
        <section className="rounded-2xl border p-6 shadow-sm bg-white space-y-6">
          <h2 className="text-xl font-semibold">Your Profile Narrative</h2>

          {mainProfile.welcome_long && (
            <div>
              <h3 className="text-lg font-semibold mb-1">Welcome</h3>
              <p className="text-sm leading-6 text-gray-800 whitespace-pre-wrap">
                {mainProfile.welcome_long}
              </p>
            </div>
          )}

          {mainProfile.introduction_long && (
            <div>
              <h3 className="text-lg font-semibold mb-1">Introduction</h3>
              <p className="text-sm leading-6 text-gray-800 whitespace-pre-wrap">
                {mainProfile.introduction_long}
              </p>
            </div>
          )}

          {mainProfile.competencies_long && (
            <div>
              <h3 className="text-lg font-semibold mb-1">Competencies</h3>
              <p className="text-sm leading-6 text-gray-800 whitespace-pre-wrap">
                {mainProfile.competencies_long}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.isArray(mainProfile.strengths) && mainProfile.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Strengths</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {mainProfile.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {Array.isArray(mainProfile.watchouts) && mainProfile.watchouts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Watch-outs</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {mainProfile.watchouts.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {Array.isArray(mainProfile.tips) && mainProfile.tips.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Tips</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {mainProfile.tips.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Actions */}
      <section className="rounded-2xl border p-6 shadow-sm bg-white">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/submissions/${id}/result`}
            className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            View raw JSON
          </a>
          {/* Place your PDF button here if you have a component for it */}
          {/* <PdfButton targetSelector="main" /> */}
        </div>
      </section>
    </main>
  );
}


