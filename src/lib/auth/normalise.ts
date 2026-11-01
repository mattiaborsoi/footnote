const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GMAIL = new Set(["gmail.com", "googlemail.com"]);
const THROWAWAY = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "temp-mail.io",
  "yopmail.com", "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com",
  "mohmal.com", "emailondeck.com", "mintemail.com", "tempr.email", "burnermail.io", "spamgourmet.com", "33mail.com", "mailnesia.com", "tempail.com",
]);

/** The identity behind an address: lower-cased, plus-tag removed, Gmail dots and its alias domain folded, so one person cannot take many trials. Null when it is not an address. */
export function emailKey(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return null;
  const at = email.lastIndexOf("@");
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (GMAIL.has(domain)) { domain = "gmail.com"; local = local.replace(/\./g, ""); }
  return local ? `${local}@${domain}` : null;
}

/** Domains that exist to be thrown away; THROWAWAY_DOMAINS adds more without a deploy. */
export function isThrowaway(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  const extra = (process.env.THROWAWAY_DOMAINS ?? "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  return THROWAWAY.has(domain) || extra.includes(domain);
}

/** "m•••@example.com": enough to recognise, not enough to copy. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${(local ?? "").slice(0, 1)}•••@${domain ?? ""}`;
}
