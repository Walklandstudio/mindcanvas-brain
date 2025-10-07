export const dynamic = 'force-dynamic';
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function Health() {
  const [status, setStatus] = useState('checking...');

  useEffect(() => {
    (async () => {
      try {
        const client = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { error } = await client.from('organizations').select('id').limit(1);
        setStatus(error ? '❌ ' + error.message : '✅ Connected to Supabase');
      } catch (e: any) {
        setStatus('❌ ' + e.message);
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-xl p-8 space-y-3">
      <h1 className="text-2xl font-semibold">Health</h1>
      <ul className="list-disc pl-6 text-gray-700">
        <li>APP_ENV: <code>{process.env.NEXT_PUBLIC_APP_ENV || 'unset'}</code></li>
        <li>Supabase: {status}</li>
      </ul>
    </main>
  );
}
