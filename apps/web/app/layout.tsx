// apps/web/app/t/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function TestLayout({ children }: { children: React.ReactNode }) {
  // No headers(), no cookies(), no env, no SB calls here.
  return <>{children}</>;
}

