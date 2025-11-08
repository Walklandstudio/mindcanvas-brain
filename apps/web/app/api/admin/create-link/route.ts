import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/server/supabaseAdmin";
import { Resend } from "resend";

export const runtime = "nodejs";

type Body = {
  orgId: string;
  testId: string;
  testDisplayName?: string | null;
  contactOwner?: string | null;
  showResults?: boolean;
  emailReport?: boolean;
  hiddenResultsMessage?: string | null;
  redirectUrl?: string | null;
  expiresAt?: string | null;
  recipientEmail?: string | null;
  recipientName?: string | null;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  process.env.RESEND_FROM ||
  "no-reply@mindcanvas.app";

function absoluteUrl(path: string) {
  const host =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const base = host.startsWith("http") ? host : \`https://\${host}\`;
  return \`\${base}\${path.startsWith("/") ? path : \`/\${path}\`}\`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!body.orgId || !body.testId)
      return NextResponse.json({ ok: false, error: "Missing orgId or testId" }, { status: 400 });

    const {
      orgId,
      testId,
      testDisplayName,
      contactOwner,
      showResults = true,
      emailReport = true,
      hiddenResultsMessage,
      redirectUrl,
      expiresAt,
      recipientEmail,
      recipientName,
    } = body;

    const sb = createClient().schema("portal");
    const token = crypto.randomUUID().replace(/-/g, "");

    const insertPayload: any = {
      token,
      org_id: orgId,
      test_id: testId,
      name: testDisplayName || null,
      contact_owner: contactOwner || null,
      show_results: !!showResults,
      email_report: !!emailReport,
      hidden_results_message: showResults ? null : hiddenResultsMessage || null,
      redirect_url: showResults ? null : redirectUrl || null,
      is_active: true,
    };

    if (expiresAt) insertPayload.expires_at = new Date(expiresAt).toISOString();

    const { data: linkRow, error: insErr } = await sb
      .from("test_links")
      .insert(insertPayload)
      .select("token")
      .single();

    if (insErr)
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

    const publicUrl = absoluteUrl(\`/t/\${linkRow!.token}\`);

    // ✅ Optional email send
    let emailResult: any = null;
    if (recipientEmail) {
      if (!RESEND_API_KEY)
        return NextResponse.json(
          {
            ok: false,
            error: "Missing RESEND_API_KEY or EMAIL_FROM env vars.",
            url: publicUrl,
          },
          { status: 500 }
        );

      const resend = new Resend(RESEND_API_KEY);
      const toName = recipientName?.trim();
      const to = toName ? \`\${toName} <\${recipientEmail}>\` : recipientEmail;
      const subject = testDisplayName
        ? \`Your \${testDisplayName} link\`
        : "Your MindCanvas test link";

      const html = \`
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6;">
          <h2 style="margin:0 0 12px;">You're invited to take a MindCanvas profile test</h2>
          \${contactOwner ? \`<p>Contact owner: <strong>\${escapeHtml(contactOwner)}</strong></p>\` : ""}
          <p>Click below to start:</p>
          <p style="margin:16px 0;">
            <a href="\${publicUrl}" style="background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Start your test</a>
          </p>
          <p style="margin:16px 0 0;font-size:12px;color:#666;">
            If the button doesn't work, copy this link:<br/>\${publicUrl}
          </p>
        </div>
      \`;

      emailResult = await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject,
        html,
      });
    }

    return NextResponse.json({
      ok: true,
      token: linkRow!.token,
      url: publicUrl,
      emailed: !!recipientEmail,
      emailResultId: emailResult?.id ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
