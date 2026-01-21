"use client";

import React from "react";

type Block =
  | { type: "p"; text: string }
  | { type: "h1" | "h2" | "h3" | "h4"; text: string }
  | { type: "ul"; items: string[] }
  | { type: string; [key: string]: any };

type Section = {
  id?: string;
  title?: string | null;
  blocks?: Block[] | null;
};

export default function BlocksRenderer(props: {
  sections: Section[];
}) {
  const { sections } = props;

  return (
    <div className="space-y-5">
      {sections.map((s, i) => (
        <div
          key={s.id || `sec-${i}`}
          className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 text-slate-900"
        >
          {s.title ? (
            <h2 className="text-lg md:text-xl font-semibold text-slate-900">
              {s.title}
            </h2>
          ) : null}

          <div className={s.title ? "mt-4" : ""}>
            <div className="space-y-3 text-sm leading-relaxed text-slate-700">
              {(s.blocks || []).map((b, j) => (
                <BlockView key={`b-${j}`} block={b} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BlockView({ block }: { block: any }) {
  const t = String(block?.type || "").toLowerCase();

  if (t === "p") {
    return <p className="whitespace-pre-wrap">{String(block.text || "")}</p>;
  }

  if (t === "h1") {
    return <h1 className="text-2xl font-bold text-slate-900">{block.text}</h1>;
  }
  if (t === "h2") {
    return <h2 className="text-xl font-bold text-slate-900">{block.text}</h2>;
  }
  if (t === "h3") {
    return <h3 className="text-base font-semibold text-slate-900">{block.text}</h3>;
  }
  if (t === "h4") {
    return <h4 className="text-sm font-semibold text-slate-900">{block.text}</h4>;
  }

  if (t === "ul") {
    const items: string[] = Array.isArray(block.items) ? block.items : [];
    return (
      <ul className="list-disc space-y-1 pl-5">
        {items.map((it, idx) => (
          <li key={idx} className="whitespace-pre-wrap">
            {it}
          </li>
        ))}
      </ul>
    );
  }

  // Unknown block types: fail safely (don’t break the report)
  const raw = JSON.stringify(block, null, 2);
  return (
    <pre className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 overflow-auto">
      {raw}
    </pre>
  );
}
