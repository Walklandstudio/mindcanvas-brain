// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">MindCanvas Web</h1>
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><Link className="underline" href="/tests">Tests</Link></li>
        <li><Link className="underline" href="/test/competency-coach">Competency Coach (direct)</Link></li>
        <li><Link className="underline" href="/dashboard">Dashboard</Link></li>
        <li><Link className="underline" href="/me">My Tests</Link></li>
      </ul>
    </main>
  );
}
