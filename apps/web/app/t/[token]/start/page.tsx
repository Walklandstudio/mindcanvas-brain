"use client";

import { useEffect, useState } from "react";

type StartOk = {
  ok: true;
  startPath: string;
  test: { id: string; name: string | null; slug: string | null };
  link: { id: string; token: string; expires_at: string | null };
  taker: { id: string; email: string | null; status: "started" };
};

export default function StartTest({ params }: { params: { token: string } }) {
  const { token } = params;
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; status?: number; message: string; details?: string }
    | { kind: "ready"; data: StartOk }
  >({ kind: "loading" });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(`/api/public/test/${token}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // include more context if needed:
          body: JSON.stringify({ email: null, meta: { ua: navigator.userAgent } }),
          cache: "no-store",
        });

        const text = await res.text();
        let json: any = undefined;
        try { json = text ? JSON.parse(text) : undefined; } catch { /* keep raw text */ }

        if (!res.ok) {
          if (!alive) return;
          setState({
            kind: "error",
            status: res.status,
            message:
              (json && (json.error || json.message)) ||
              `Start failed with ${res.status}`,
            details: json?.details || text || undefined,
          });
          return;
        }

        if (!alive) return;
        setState({ kind: "ready", data: json as StartOk });
      } catch (e: any) {
        if (!alive) return;
        setState({
          kind: "error",
          message: e?.message || "Network error starting test",
        });
      }
    })();

    // helpful global logs while debugging
    const rej = (ev: PromiseRejectionEvent) =>
      console.warn("Unhandled rejection:", ev.reason);
    window.addEventListener("unhandledrejection", rej);

    return () => {
      alive = false;
      window.removeEventListener("unhandledrejection", rej);
    };
  }, [token]);

  if (state.kind === "loading") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Preparing your test…</h1>
        <p className="text-sm text-slate-600">Checking link and creating your session.</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">We couldn’t start your test</h1>
        <p className="text-sm text-red-700">
          {state.status ? `${state.status}: ` : ""}{state.message}
        </p>
        {state.details && (
          <pre className="p-3 bg-red-50 border text-xs overflow-auto whitespace-pre-wrap">
            {state.details}
          </pre>
        )}
        <p className="text-sm text-slate-600">
          If you’re using extensions (ad blockers, password managers), try an Incognito window.
        </p>
      </div>
    );
  }

  const { data } = state;
  // If your flow should jump straight to questions, link there:
  const questionsHref = `/t/${data.link.token}`; // or `/t/${data.link.token}/questions` if that’s your route

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Ready to begin</h1>
      <div className="text-sm">
        Test: <span className="font-medium">{data.test.name ?? data.test.slug ?? data.test.id}</span>
      </div>
      <a
        href={questionsHref}
        className="inline-block px-4 py-2 rounded bg-black text-white hover:opacity-90"
      >
        Start questions
      </a>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-slate-600">Debug info</summary>
        <pre className="p-3 bg-slate-50 border text-xs overflow-auto whitespace-pre-wrap">
{JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}
