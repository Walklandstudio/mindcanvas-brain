'use client';
import { useRouter } from 'next/navigation';
import { createTestAction } from './_actions';

export default function TestBuilderTopBar() {
  const router = useRouter();

  async function handleCreate(mode: 'free' | 'full') {
    const name = window.prompt('Name this test:');
    if (!name) return;
    const { id } = await createTestAction({ name, mode });
    router.push(`/admin/tests/${id}`);
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={() => handleCreate('free')} className="px-4 py-2 rounded-2xl bg-white text-black">
        Create Free Test
      </button>
      <button onClick={() => handleCreate('full')} className="px-4 py-2 rounded-2xl bg-white text-black">
        Create Full Test
      </button>
    </div>
  );
}
