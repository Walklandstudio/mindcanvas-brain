import { Suspense } from "react";
import EditorClient from "./EditorClient";

export const dynamic = "force-dynamic"; // avoid prerender surprises
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function Page() {
  return (
    <Suspense fallback={<ShellFallback />}>
      <EditorClient />
    </Suspense>
  );
}

function ShellFallback() {
  return (
    <main className="max-w-5xl mx-auto p-6 text-white">
      <h1 className="text-4xl font-bold tracking-tight">Profile Editor</h1>
      <p className="text-white/70 mt-2">Loading…</p>
    </main>
  );
}
