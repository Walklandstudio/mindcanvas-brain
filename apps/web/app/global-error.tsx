'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body>
        <div className="p-6 space-y-3">
          <h1 className="text-xl font-semibold">App error</h1>
          <p>We hit an unexpected error. You can try again.</p>
          <button className="rounded px-3 py-2 border" onClick={() => reset()}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
