/** Product events from the browser: no cookies, an id this browser made up, a small bag of fields. */
const KEY = "footnote.session";

export function sessionId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anonymous000";
  }
}

export function track(type: string, fields: Record<string, string | number | boolean> = {}, walkId?: string): void {
  try {
    const body = JSON.stringify({ type, fields, sessionId: sessionId(), ...(walkId ? { walkId } : {}) });
    if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    }
  } catch {
    /* never let logging break the page */
  }
}

/** "now" or the browser's local time with its offset, which is what the planner expects. */
export function whenString(date: string, time: string): string {
  if (!date) return "now";
  const off = -new Date().getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return `${date}T${time || "10:00"}:00${sign}${hh}:${mm}`;
}
