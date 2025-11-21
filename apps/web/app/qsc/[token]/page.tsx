// apps/web/app/qsc/[token]/page.tsx
import React from "react";

type QscResults = {
  personality_totals: Record<string, number>;
  personality_percentages: Record<string, number>;
  mindset_totals: Record<string, number>;
  mindset_percentages: Record<string, number>;
  combined_profile_code: string | null;
};

type QscProfile = {
  title?: string | null;
  description?: string | null;
};

type QscResultApiResponse = {
  ok: boolean;
  error?: string;
  results?: QscResults;
  profile?: QscProfile | null;
};

async function getData(token: string): Promise<QscResultApiResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const res = await fetch(`${baseUrl}/api/public/qsc/${token}/result`, {
    cache: "no-store",
  });

  // If the API fails, we still want a consistent shape
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` };
  }

  return (await res.json()) as QscResultApiResponse;
}

export default async function QscResultPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const data = await getData(token);

  if (!data.ok || !data.results) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold mb-2">Quantum Source Code</h1>
        <p className="text-red-600">
          {data.error || "No results found for this link yet."}
        </p>
      </div>
    );
  }

  const { results, profile } = data;

  return (
    <div className="p-10 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-4xl font-bold mb-2">Your Quantum Source Code</h1>
        <p className="text-slate-600">
          A snapshot of your sales Personality and Mindset, ready to plug into your
          sales process.
        </p>
      </header>

      {/* Overall Profile */}
      <section className="bg-white shadow p-6 rounded-xl border border-slate-100">
        <h2 className="text-2xl font-semibold mb-3">Overall Profile</h2>
        <p className="text-xl font-bold mb-2">
          {results.combined_profile_code || "Profile in progress"}
        </p>

        {profile && (
          <>
            {profile.title && (
              <p className="text-lg font-semibold mt-2">{profile.title}</p>
            )}
            {profile.description && (
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-line">
                {profile.description}
              </p>
            )}
          </>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personality */}
        <div className="bg-slate-50 p-6 rounded-xl shadow-inner">
          <h3 className="text-xl font-bold mb-4">Personality</h3>
          {Object.entries(results.personality_percentages).map(([key, val]) => (
            <div key={key} className="flex justify-between py-1 text-sm">
              <span className="font-medium">{key}</span>
              <span>{Number(val).toFixed(1)}%</span>
            </div>
          ))}
        </div>

        {/* Mindset */}
        <div className="bg-slate-50 p-6 rounded-xl shadow-inner">
          <h3 className="text-xl font-bold mb-4">Mindset</h3>
          {Object.entries(results.mindset_percentages).map(([key, val]) => (
            <div key={key} className="flex justify-between py-1 text-sm">
              <span className="font-medium">{key}</span>
              <span>{Number(val).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
