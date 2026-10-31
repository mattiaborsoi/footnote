import { cached, throttled, USER_AGENT } from "./cache";

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
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, signal: ctl.signal, redirect: "follow" });
        if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
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
