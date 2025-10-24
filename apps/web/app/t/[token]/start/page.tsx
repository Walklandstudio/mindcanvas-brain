"use client";
import { useEffect, useState } from "react";

export default function StartTest({ params }: { params: { token: string } }) {
  const { token } = params;
  const [state, setState] = useState<
    | { type: "loading" }
    | { type: "error"; status?: number; message: string; details?: string }
    | { type: "ready"; testName: string; next: string }
  >({ type: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/public/test/${token}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const txt = await res.text();
        const json = txt ? JSON.parse(txt) : {};

        if (!res.ok) {
          if (active)
            setState({
              type: "error",
              status: res.status,
              message:
                json?.error || `Unexpected ${res.status} error starting test`,
              details: json?.details,
            });
          return;
        }

        if (active)
          setState({
            type: "ready",
            testName: json.test?.name || json.test?.slug || "Untitled Test",
            next: `/t/${token}`,
          });
      } catch (err: any) {
        if (active)
          setState({
            type: "error",
            message: err?.message || "Network error",
          });
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  if (state.type === "loading") {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-xl font-semibold">Starting your test…</h1>
        <p className="text-slate-500 text-sm">Please wait while we prepare your session.</p>
      </div>
    );
  }

  if (state.type === "error") {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold text-red-700">
          Could not start your test
        </h1>
        <p className="text-sm text-red-600">
          {state.status ? `${state.status}: ` : ""}
          {state.message}
        </p>
        {state.details && (
          <pre className="bg-red-50 border text-xs p-2 rounded whitespace-pre-wrap">
            {state.details}
          </pre>
        )}
        <p className="text-slate-600 text-sm">
          Try again later or contact your administrator.
        </p>
      </div>
    );
  }

  if (state.type === "ready") {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">
          {state.testName}
        </h1>
        <p className="text-slate-600">Your test is ready to begin.</p>
        <a
          href={state.next}
          className="inline-block bg-black text-white px-4 py-2 rounded hover:opacity-90"
        >
          Start Now
        </a>
      </div>
    );
  }

  return null;
}
