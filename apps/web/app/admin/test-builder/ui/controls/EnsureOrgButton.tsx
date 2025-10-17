'use client';

import { ensureOrgAction } from '../../_actions';
import { useRouter } from 'next/navigation';

export function EnsureOrgButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await ensureOrgAction({ name: 'Demo Org' });
        router.refresh();
      }}
      className="px-4 py-2 rounded-2xl bg-white text-black"
    >
      Create demo org
    </button>
  );
}
