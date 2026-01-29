import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OrgRootRedirect({ params }: { params: { slug: string } }) {
  redirect(`/portal/${params.slug}/dashboard`);
}
