import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { cached, throttled, USER_AGENT } from "./cache";

/** Only the public web: http(s), a real host, no private or local address. A search result is not a trusted URL. */
export async function isPublicUrl(raw: string): Promise<boolean> {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:" || u.username || u.password) return false;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  const addrs = isIP(host) ? [host] : await lookup(host, { all: true }).then((r) => r.map((x) => x.address)).catch(() => []);
  return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a));
}

export function isPrivateAddress(a: string): boolean {
  if (a.includes(":")) { const h = a.toLowerCase(); return h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") || h.startsWith("::ffff:"); }
  const [a1, a2] = a.split(".").map(Number);
  return a1 === 10 || a1 === 127 || a1 === 0 || (a1 === 169 && a2 === 254) || (a1 === 172 && a2 >= 16 && a2 <= 31) || (a1 === 192 && a2 === 168) || (a1 === 100 && a2 >= 64 && a2 <= 127);
}

/** Rough HTML to text: drop scripts, styles and navigation, keep the words. Enough for extraction. */
export function htmlToText(html: string, max = 8000): string {
  const text = html
    .replace(/<head[\s\S]*?<\/head>/i, " ")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  return text.slice(0, max);
}

/** The handful of entities that turn up in titles and snippets. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|ldquo|rdquo|ndash|mdash|hellip);/gi, (m, code: string) => {
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: "–", mdash: "—", hellip: "…" };
    if (code[0] === "#") { const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return named[code.toLowerCase()] ?? m;
  });
}

export function pageTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  return m ? decodeEntities(m[1]).replace(/\s+/g, " ").trim() : "";
}

export async function readPage(url: string): Promise<{ title: string; text: string } | null> {
  return cached(`page:${url}`, 24 * 3600_000, () =>
    throttled("readpage", 800, async () => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 10_000);
      try {
        let current = url;
        let res: Response | null = null;
        for (let hop = 0; hop < 4; hop++) {
          if (!(await isPublicUrl(current))) return null;
          res = await fetch(current, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, signal: ctl.signal, redirect: "manual" });
          const to = res.headers.get("location");
          if (res.status >= 300 && res.status < 400 && to) { current = new URL(to, current).toString(); res = null; continue; }
          break;
        }
        if (!res || !res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
        const html = (await res.text()).slice(0, 600_000);
        return { title: pageTitle(html), text: htmlToText(html) };
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }),
  );
}
