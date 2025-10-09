import QuestionEditor from './_components/QuestionEditor';

export const dynamic = 'force-dynamic';

export default function QuestionsPage() {
  return (
    <main className="container-page">
      <h1 className="section-title mb-4">Question Bank</h1>
      <p className="text-sm text-slate-600 mb-6">
        Manage your 15 core questions and add segmentation questions. Use weights for scoring; set kind & options as needed.
      </p>
      <QuestionEditor />
    </main>
  );
}
