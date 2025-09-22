import TestRunner from '@/components/TestRunner';

export default function TestPage({ params }: { params: { slug: string } }) {
  // For your tenant, pass the org slug you created (e.g., 'competency-coach')
  return (
    <div className="p-6">
      <TestRunner slug={params.slug} orgSlug="competency-coach" />
    </div>
  );
}
