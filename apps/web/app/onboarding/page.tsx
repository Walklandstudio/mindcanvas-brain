'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export default function OnboardingPage() {
  const router = useRouter();

  // Create a browser Supabase client for the Auth UI
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // If we already have a session, bounce back to Test Builder
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) router.replace('/admin/test-builder');
    });
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const redirectTo =
    (typeof window !== 'undefined' ? window.location.origin : 'https://mindcanvas-staging.vercel.app') +
    '/admin/test-builder';

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow">
        <h1 className="mb-2 text-xl font-semibold">Welcome to MindCanvas</h1>
        <p className="mb-6 text-sm text-gray-600">
          Sign in to access the Test Builder. We’ll set up your workspace automatically.
        </p>

        <Auth
          supabaseClient={supabase}
          providers={['google', 'github']}
          magicLink={true}
          redirectTo={redirectTo}
          appearance={{ theme: ThemeSupa }}
          localization={{
            variables: {
              sign_in: { email_label: 'Work email' },
            },
          }}
        />

        <p className="mt-4 text-xs text-gray-500">
          After signing in you’ll be redirected to the Test Builder. We’ll create a demo org,
          a default test, and seed the 15 base questions if needed.
        </p>
      </div>
    </main>
  );
}
