import LinkCreateForm from '@/components/admin/LinkCreateForm';

export const runtime = 'nodejs';
export const revalidate = 0;

export default function OrgLinksPage({ params }: { params: { org: string } }) {
  return (
    <div className="p-6">
      <LinkCreateForm />
    </div>
  );
}
