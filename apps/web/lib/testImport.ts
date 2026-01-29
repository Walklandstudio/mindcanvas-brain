// apps/web/lib/testImport.ts

export type TestOptionImport = {
  label: string;   // e.g. "A"
  value: string;   // e.g. "Paint a bold vision"
  profile: string; // e.g. "A" (or "FLOW", etc.)
  points?: number; // defaults to 1
};

export type TestQuestionImport = {
  idx: number;       // 1-based index
  text: string;
  options: TestOptionImport[];
};

export type TestImportPayload = {
  test: {
    name: string;
    slug: string;
    description?: string;
    test_type?: string;         // e.g. "qsc"
    framework_id?: string | null;
    report_template_id?: string | null;
  };
  questions: TestQuestionImport[];
};

export type TestQuestionInsert = {
  idx: number;
  question: string;
  type: string;
  options: any;
  profile_map: any;
};

/**
 * Turn import JSON into:
 * - a test row (without org_id)
 * - question rows (without test_id)
 */
export function transformImportToDbRows(
  payload: TestImportPayload
): {
  testRow: {
    name: string;
    slug: string;
    description?: string | null;
    type: string;
    framework_id?: string | null;
    report_template_id?: string | null;
    is_active: boolean;
  };
  questionRows: TestQuestionInsert[];
} {
  const { test, questions } = payload;

  const testRow = {
    name: test.name,
    slug: test.slug,
    description: test.description ?? null,
    type: test.test_type ?? "qsc",           // default; your scoring can branch on this
    framework_id: test.framework_id ?? null,
    report_template_id: test.report_template_id ?? null,
    is_active: true,
  };

  const questionRows: TestQuestionInsert[] = questions.map((q) => {
    const options = q.options.map((opt) => ({
      label: opt.label,
      value: opt.value,
    }));

    const profile_map = q.options.map((opt) => ({
      profile: opt.profile,
      points: opt.points ?? 1,
    }));

    return {
      idx: q.idx,
      question: q.text,
      type: "single_choice", // matches how QSC questions work in your system
      options,
      profile_map,
    };
  });

  return { testRow, questionRows };
}
