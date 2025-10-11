'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function FrameworkPage() {
  const [framework, setFramework] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const loadFramework = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setError('Not authenticated');
          return;
        }

        // Fetch org + framework data
        const { data, error } = await supabase
          .from('org_frameworks')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setFramework(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    loadFramework();
  }, [supabase]);

  if (error) {
    return (
      <main className="p-8 text-red-400">
        <h1 className="text-2xl font-semibold">Framework Load Error</h1>
        <p className="mt-4">{error}</p>
      </main>
    );
  }

  if (!framework) {
    return (
      <main className="p-8 text-gray-400">
        <h1 className="text-2xl font-semibold">Loading framework…</h1>
      </main>
    );
  }

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Framework Overview</h1>
      <div className="p-6 rounded-lg bg-gray-900 border border-gray-700">
        <p className="text-sm text-gray-400">Framework ID: {framework.id}</p>
        <p className="text-lg mt-2">
          <strong>Name:</strong> {framework.name || 'Untitled Framework'}
        </p>
        <p className="text-lg mt-1">
          <strong>Version:</strong> {framework.version || 'N/A'}
        </p>
        <p className="text-lg mt-1">
          <strong>Profiles:</strong> {framework.profile_count || '—'}
        </p>
      </div>
    </main>
  );
}
