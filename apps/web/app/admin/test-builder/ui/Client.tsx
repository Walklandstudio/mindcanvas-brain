'use client';

import { RephraseQuestion, RephraseOption } from '../RephrasePanel';

export default function Client({
  tests,
  active,
}: {
  tests: Array<{ id: string; name: string; mode: string }>;
  active: {
    id: string;
    name: string;
    mode: string;
    test_questions: Array<{
      id: string;
      idx: number;
      stem: string;
      stem_rephrased: string | null;
      test_options: Array<{
        id: string;
        idx: number;
        label: string;
        label_rephrased: string | null;
        frequency: string;
        profile: string;
        points: number;
      }>;
    }>;
  } | null;
}) {
  if (!tests.length) {
    return (
      <section className="rounded-2xl border p-4">
        <p>No tests yet. Create a Free or Full test to begin.</p>
      </section>
    );
  }

  if (!active) {
    return (
      <section className="rounded-2xl border p-4">
        <p>Select a test from the “Active test” dropdown.</p>
      </section>
    );
  }

  const qs = [...(active.test_questions ?? [])].sort((a, b) => a.idx - b.idx);

  if (!qs.length) {
    return (
      <section className="rounded-2xl border p-4">
        <p>
          This test has no questions yet. Click <b>Import template</b> above to
          seed defaults.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {qs.map((q, i) => (
        <div key={q.id} className="rounded-2xl border p-4 space-y-3 bg-white">
          <div className="font-semibold">
            {i + 1}. {q.stem_rephrased ?? q.stem}
          </div>

          <RephraseQuestion q={{ id: q.id, stem: q.stem, stem_rephrased: q.stem_rephrased ?? undefined }} />

          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {q.test_options
              .slice()
              .sort((a, b) => a.idx - b.idx)
              .map((o) => (
                <div key={o.id} className="rounded-xl border p-3">
                  <div className="text-sm text-gray-500">
                    {o.frequency} • {o.profile} • {o.points} pts
                  </div>
                  <div className="mt-1">{o.label_rephrased ?? o.label}</div>
                  <div className="mt-2">
                    <RephraseOption
                      o={{
                        id: o.id,
                        label: o.label,
                        label_rephrased: o.label_rephrased ?? undefined,
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}
