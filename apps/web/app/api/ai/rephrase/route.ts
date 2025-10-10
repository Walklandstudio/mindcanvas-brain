import { NextRequest, NextResponse } from 'next/server';
import { admin, getOwnerOrgAndFramework } from '../../_lib/org';

export const POST = async (req: NextRequest) => {
  try {
    const q = new URL(req.url).searchParams.get('q');
    const num = Number(q);
    if (!num || num < 1 || num > 15) {
      return NextResponse.json({ ok: false, error: 'Invalid question number' }, { status: 400 });
    }

    const a = admin();
    const { orgId, frameworkId } = await getOwnerOrgAndFramework();

    const { data, error } = await a
      .from('org_questions')
      .select('prompt')
      .eq('org_id', orgId)
      .eq('framework_id', frameworkId)
      .eq('question_no', num)
      .maybeSingle();

    if (error) throw error;
    const original = data?.prompt ?? '';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Graceful no-op
      return NextResponse.json({ ok: true, prompt: original });
    }

    // Super minimal rephrase call to OpenAI
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You rewrite questions for clarity while keeping intent identical.' },
          { role: 'user', content: `Rewrite this test question clearly and concisely: "${original}"` }
        ],
        temperature: 0.3,
      }),
    });

    const json = await resp.json();
    const newText =
      json?.choices?.[0]?.message?.content?.trim() || original;

    // Save updated prompt
    const { error: upErr } = await a
      .from('org_questions')
      .update({ prompt: newText })
      .eq('org_id', orgId).eq('framework_id', frameworkId).eq('question_no', num);
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true, prompt: newText });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'error' }, { status: 500 });
  }
};
