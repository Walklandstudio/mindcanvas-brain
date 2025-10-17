'use client';

import { useState } from 'react';

export default function PreviewButton({ testId }: { testId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function onPreview() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/reports/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ testId }),
      });
      const json = await res.json();
      setData(json.preview);
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={onPreview} disabled={busy} className="px-3 py-2 rounded-2xl border">
        {busy ? 'Generating…' : 'Preview'}
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white max-w-3xl w-[90%] p-4 rounded-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Report Preview</h3>
              <button onClick={() => setOpen(false)} className="text-sm">Close</button>
            </div>
            <pre className="text-xs overflow-auto max-h-[70vh] bg-neutral-900 text-neutral-100 p-3 rounded">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
