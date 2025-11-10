'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  createTestAction,
  importTemplateAction,
  createPublicLinkAction,
  addSegmentationQuestionAction,
} from '../_actions';

export default function TopBar({
  tests,
  activeId,
}: {
  tests: Array<{ id: string; name: string; mode: 'free' | 'full' | string }>;
  activeId: string | null;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const view = search?.get("view") ?? "list";
  // and any other search.get(...) → search?.get(...) ?? ""
  

  async function onCreate(mode: 'free' | 'full') {
    const name = window.prompt(`Name this ${mode} test:`) || '';
    if (!name.trim()) return;
    const { id } = await createTestAction({ name, mode });
    router.push(`/admin/test-builder?test=${id}`);
  }

  async function onImport() {
    if (!activeId) return;
    const ok = window.confirm('Import the 15 base questions into this test?');
    if (!ok) return;
    await importTemplateAction({ testId: activeId });
    router.refresh();
  }

  function onPick(id: string) {
    const sp = new URLSearchParams(search?.toString() ?? '');
    sp.set('test', id);
    router.push(`/admin/test-builder?${sp.toString()}`);
  }

  async function onPublicLink() {
    if (!activeId) return;
    const { url, iframe } = await createPublicLinkAction({ testId: activeId });
    alert(`Created Public Test\n\nPublic URL:\n${url}\n\nEmbed (iframe):\n${iframe}`);
  }

  async function onAddSeg() {
    if (!activeId) return;
    const stem = window.prompt('Segmentation question text:');
    if (!stem) return;
    const raw = window.prompt('Comma-separated options (labels only):', 'Option 1, Option 2, Option 3');
    if (!raw) return;
    const options = raw.split(',').map((s) => s.trim()).filter(Boolean);
    await addSegmentationQuestionAction({ testId: activeId, stem, options });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={() => onCreate('free')} className="px-4 py-2 rounded-2xl bg-white text-black">
        Create Free Test
      </button>
      <button onClick={() => onCreate('full')} className="px-4 py-2 rounded-2xl bg-white text-black">
        Create Full Test
      </button>

      <div className="ml-auto flex items-center gap-2">
        <label className="text-sm">Active test</label>
        <select
          className="rounded-2xl border px-3 py-2 bg-white"
          value={activeId ?? ''}
          onChange={(e) => onPick(e.target.value)}
        >
          <option value="" disabled>Select…</option>
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.mode})
            </option>
          ))}
        </select>

        <button onClick={onImport} disabled={!activeId} className="px-3 py-2 rounded-2xl border">
          Import template (15)
        </button>

        <button onClick={onAddSeg} disabled={!activeId} className="px-3 py-2 rounded-2xl border">
          Add segmentation Q
        </button>

        <button onClick={onPublicLink} disabled={!activeId} className="px-3 py-2 rounded-2xl border">
          Get public link
        </button>
      </div>
    </div>
  );
}
