// apps/web/app/portal/[slug]/profile/page.tsx
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export default function Page({
  params,
}: {
  params: { slug: string };
}) {
  return <ProfileClient slug={params.slug} />;
}
