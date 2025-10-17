// apps/web/app/onboarding/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '../_lib/supabase/server';
import AuthForm from './ui/AuthForm';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const sb = createClient();
  const { data: userRes } = await sb.auth.getUser();

  const sp = (await searchParams) ?? {};
  const next = sp.next && sp.next.startsWith('/') ? sp.next : '/admin/test-builder';

  // If already signed in, go straight to next (no client flicker)
  if (userRes?.user) {
    redirect(next);
  }

  // Not signed in: render the auth form (client component)
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow space-y-4">
        <h1 className="text-xl font-semibold">Welcome to MindCanvas</h1>
        <p className="text-sm text-gray-600">
          Sign in to access the Test Builder. We’ll set up your workspace automatically.
        </p>
        <AuthForm next={next} />
        <p className="mt-2 text-xs text-gray-500">
          After sign-in you’ll be redirected to the Test Builder. We’ll create a demo org,
          a default test, and seed the 15 base questions if needed.
        </p>
      </div>
    </main>
  );
}
