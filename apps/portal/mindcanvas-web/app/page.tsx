// app/page.tsx
export default function Home() {
  return (
    <main className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">MindCanvas Web</h1>
      <ul className="list-disc pl-5 text-sm">
        <li><a className="underline" href="/tests">Tests</a></li>
        <li><a className="underline" href="/test/competency-coach">Competency Coach (direct)</a></li>
        <li><a className="underline" href="/dashboard">Dashboard</a></li>
        <li><a className="underline" href="/me">My Tests</a></li>
      </ul>
    </main>
  );
}
