export default function Health() {
  return (
    <main className="mx-auto max-w-xl p-8 space-y-3">
      <h1 className="text-2xl font-semibold">Health</h1>
      <ul className="list-disc pl-6 text-gray-700">
        <li>APP_ENV: <code>{process.env.NEXT_PUBLIC_APP_ENV || 'unset'}</code></li>
      </ul>
    </main>
  );
}
