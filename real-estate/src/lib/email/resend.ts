// Resend wrapper — RESEND_API_KEY байхгүй бол console-д log хийгээд no-op хийнэ
// (local dev-д email send хийхгүйгээр шалгахад тус болно).
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "nemi.mn <noreply@nemi.mn>";

const client = apiKey ? new Resend(apiKey) : null;

export interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  replyTo?: string;
}

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!client) {
    console.warn("[email] RESEND_API_KEY missing — would send:", {
      to: args.to,
      subject: args.subject,
    });
    return { ok: true, id: "dev-no-op" };
  }

  try {
    const { data, error } = await client.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      ...(args.cc ? { cc: args.cc } : {}),
      ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    });
    if (error) {
      console.error("[email] send failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[email] threw:", msg);
    return { ok: false, error: msg };
  }
}
