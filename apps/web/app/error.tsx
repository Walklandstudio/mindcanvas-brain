'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p>Please try again or go back to the portal.</p>
      <button
        className="rounded px-3 py-2 border"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
