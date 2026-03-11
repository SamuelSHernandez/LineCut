/**
 * Email sending utility for LineCut.
 *
 * Uses the Resend API when RESEND_API_KEY is configured.
 * Falls back to console.log in development or when the key is absent.
 *
 * This is a server-only module -- never import from client components.
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail(
  to: string,
  template: EmailTemplate
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "LineCut <noreply@linecut.app>";

  // Graceful fallback: log to console when no API key is configured
  if (!apiKey) {
    console.log(
      "[email] RESEND_API_KEY not set -- logging email instead of sending."
    );
    console.log(`[email] To: ${to}`);
    console.log(`[email] From: ${from}`);
    console.log(`[email] Subject: ${template.subject}`);
    console.log(`[email] Text:\n${template.text}`);
    return { success: true, id: "dev-logged" };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend API error (${res.status}):`, body);
      return { success: false, error: `Resend API error: ${res.status}` };
    }

    const data = (await res.json()) as { id: string };
    return { success: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] sendEmail failed:", message);
    return { success: false, error: message };
  }
}
