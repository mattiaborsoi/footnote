import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | null | undefined;

function get(): Transporter | null {
  if (transport !== undefined) return transport;
  const host = process.env.SMTP_HOST;
  if (!host) return (transport = null);
  transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
  return transport;
}

/** One transactional email, plain text. False when no mail server is configured; the address is never logged. */
export async function sendMail(m: { to: string; subject: string; text: string }): Promise<boolean> {
  const t = get();
  if (!t) { console.warn(JSON.stringify({ event: "mail.unsent", subject: m.subject })); return false; }
  await t.sendMail({ from: process.env.MAIL_FROM ?? "Footnote <no-reply@localhost>", to: m.to, subject: m.subject, text: m.text });
  return true;
}
