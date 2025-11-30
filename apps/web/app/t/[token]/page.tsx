import TestShell from './TestShell';
import PublicTestClient from './PublicTestClient';

/**
 * Public Test Page
 * --------------------------------------------------------
 * Renders the branded shell and embeds the existing
 * PublicTestClient logic inside (Supabase + scoring intact).
 */

export default function Page({ params }: { params: { token: string } }) {
  return (
    <TestShell>
      <PublicTestClient token={params.token} />
    </TestShell>
  );
}