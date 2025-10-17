'use client';
import { useState } from 'react';

type Section = {
  id: string;
  title: string;
  content: string;
};

export default function ClientEditor() {
  const [sections, setSections] = useState<Section[]>([]);

  function addSection() {
    setSections(prev => [
      ...prev,
      { id: crypto.randomUUID(), title: 'Untitled', content: '' }
    ]);
  }

  function updateTitle(id: string, title: string) {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, title } : s)));
  }

  function updateContent(id: string, content: string) {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, content } : s)));
  }

  return (
    <div className="p-6 space-y-4">
      <button className="rounded bg-sky-600 px-3 py-2 text-white" onClick={addSection}>
        Add section
      </button>

      {sections.map((s) => (
        <div key={s.id} className="rounded border p-4 space-y-2">
          <input
            className="w-full rounded border px-3 py-2"
            value={s.title}
            onChange={(e) => updateTitle(s.id, e.target.value)}
            placeholder="Section title"
          />
          <textarea
            className="w-full rounded border px-3 py-2 min-h-[120px]"
            value={s.content}
            onChange={(e) => updateContent(s.id, e.target.value)}
            placeholder="Section content"
          />
        </div>
      ))}
    </div>
  );
}
