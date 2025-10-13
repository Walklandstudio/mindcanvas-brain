"use client";

import React from "react";

export type TestClientProps = {
  slug: string;
  initialSid?: string;
  prefill?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

export default function TestClient({ slug, initialSid, prefill }: TestClientProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm text-white/60">Test slug</div>
      <div className="text-lg font-semibold">{slug}</div>

      {initialSid ? (
        <div className="text-sm text-white/70">
          Session: <span className="font-mono">{initialSid}</span>
        </div>
      ) : null}

      {prefill && (prefill.name || prefill.email || prefill.phone) ? (
        <div className="text-sm text-white/70">
          Prefill:&nbsp;
          <span className="font-mono">
            {JSON.stringify(prefill)}
          </span>
        </div>
      ) : null}

      {/* Replace this with your actual test UI */}
      <button className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
        Start test
      </button>
    </div>
  );
}
