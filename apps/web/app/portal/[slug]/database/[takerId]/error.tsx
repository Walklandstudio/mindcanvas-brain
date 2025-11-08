"use client";
export default function TakerError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">Taker page error</h1>
      <p className="text-sm text-gray-600 mb-4">{error?.message || "An unexpected error occurred."}</p>
      <button onClick={() => reset()} className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">Try again</button>
    </div>
  );
}
