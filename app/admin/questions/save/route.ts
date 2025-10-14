// apps/web/app/admin/questions/save/route.ts
import { NextResponse } from 'next/server';
import { admin } from '../../../api/_lib/org';
import { BASE_QUESTIONS, WEIGHTS } from '../seed';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const orgId = String(form.get('orgId') || '');
    const frameworkId = String(form.get('frameworkId') || '');
    if (!orgId || !frameworkId) {
      return NextResponse.json({ ok: false, error: 'Missing org/framework' }, { status: 400 });
    }

    const rows = BASE_QUESTIONS.map((q) => {
      const prompt = (form.get(`q${q.question_no}_prompt`) as string) ?? q.prompt;
      const options = q.options.map((opt) => ({
        key: opt.key,
        label: (form.get(`q${q.question_no}_${opt.key}`) as string) ?? opt.label,
      }));
      const weights = WEIGHTS.find((w) => w.question_no === q.question_no)!.weights;

      return {
        org_id: orgId,
        framework_id: frameworkId,
        question_no: q.question_no,
        prompt,
        options,
        weights,
      };
    });

    const sb = admin();
    const { error } = await sb.from('org_questions').upsert(rows, {
      onConflict: 'org_id,framework_id,question_no',
      ignoreDuplicates: false,
    });
    if (error) throw error;

    return NextResponse.redirect(new URL('/admin/questions?saved=1', req.url));
  } catch (e: any) {
    console.error('save questions failed', e);
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
