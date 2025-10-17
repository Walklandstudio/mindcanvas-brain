// apps/web/app/admin/test-builder/page.tsx
import DemoClient from './DemoClient';

export const dynamic = 'force-dynamic';

// Always render the demo client UI (no auth, no DB)
// This guarantees the page shows the 15 base questions immediately.
export default function Page() {
  return <DemoClient />;
}
