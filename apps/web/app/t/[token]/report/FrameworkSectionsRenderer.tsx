"use client";

export type ReportBlock =
  | { type: "p"; text: string }
  | { type: "h2" | "h3" | "h4"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export type ReportSection = {
  id: string;
  title?: string | null;
  blocks: ReportBlock[];
};

export type ReportSections = {
  common?: ReportSection[] | null;
  profile?: ReportSection[] | null;
};

function isArray<T>(x: any): x is T[] {
  return Array.isArray(x);
}

export default function FrameworkSectionsRenderer({ sections }: { sections?: ReportSections }) {
  const common = isArray<ReportSection>(sections?.common) ? (sections!.common as ReportSection[]) : [];
  const profile = isArray<ReportSection>(sections?.profile) ? (sections!.profile as ReportSection[]) : [];

  const all = [...common, ...profile];

  if (!all.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200">
        No report content found yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {all.map((sec) => (
        <section key={sec.id} className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900">
          {sec.title ? <h2 className="text-xl font-semibold">{sec.title}</h2> : null}

          <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
            {sec.blocks.map((b, idx) => {
              if (b.type === "p") return <p key={idx}>{b.text}</p>;
              if (b.type === "h2") return <h3 key={idx} className="pt-2 text-lg font-semibold text-slate-900">{b.text}</h3>;
              if (b.type === "h3") return <h4 key={idx} className="pt-2 text-base font-semibold text-slate-900">{b.text}</h4>;
              if (b.type === "h4") return <h5 key={idx} className="pt-2 text-sm font-semibold text-slate-900">{b.text}</h5>;
              if (b.type === "ul") {
                return (
                  <ul key={idx} className="list-disc pl-5 space-y-1">
                    {b.items.map((it, i) => <li key={i}>{it}</li>)}
                  </ul>
                );
              }
              if (b.type === "ol") {
                return (
                  <ol key={idx} className="list-decimal pl-5 space-y-1">
                    {b.items.map((it, i) => <li key={i}>{it}</li>)}
                  </ol>
                );
              }
              return null;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
