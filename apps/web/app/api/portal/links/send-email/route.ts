import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmailBody = {
  email: string;
  linkUrl: string;
  orgName?: string;
  testName?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as EmailBody;

    const email = (body.email || "").trim();
    const linkUrl = (body.linkUrl || "").trim();
    const orgName = (body.orgName || "").trim();
    const testName = (body.testName || "").trim();

    if (!email || !linkUrl) {
      return NextResponse.json(
        { error: "Missing email or linkUrl" },
        { status: 400 }
      );
    }

    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey =
      process.env.ONESIGNAL_REST_API_KEY ||
      process.env.ONESIGNAL_API_KEY ||
      "";

    // If OneSignal isn’t configured, don’t fail link creation – just skip.
    if (!appId || !apiKey) {
      console.warn(
        "[send-email] Missing OneSignal env (ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY). Skipping email send."
      );
      return NextResponse.json(
        { ok: false, skipped: true, reason: "Missing OneSignal env" },
        { status: 200 }
      );
    }

    const subject =
      (orgName && testName && `${orgName} — ${testName}`) ||
      testName ||
      "Your profile test";

    const bodyText =
      `Hi,\n\n` +
      `You’ve been invited to complete the${orgName ? ` ${orgName}` : ""}${
        testName ? ` — ${testName}` : " profile test"
      }.\n\n` +
      `Start your test here:\n${linkUrl}\n\n` +
      `Thank you.\n`;

    const payload = {
      app_id: appId,
      include_email_tokens: [email],
      email_subject: subject,
      email_body: bodyText,
    };

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "[send-email] OneSignal error",
        res.status,
        text.slice(0, 400)
      );
      return NextResponse.json(
        { error: "OneSignal request failed" },
        { status: 500 }
      );
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e: any) {
    console.error("[send-email] Unexpected error", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
