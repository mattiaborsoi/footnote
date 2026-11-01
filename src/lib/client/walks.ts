import { sessionId } from "./events";

const KEY = "footnote.walks";

/** Walks this browser built, so they can be claimed after signing in. */
export function rememberWalk(id: string): void {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    localStorage.setItem(KEY, JSON.stringify([id, ...ids.filter((x) => x !== id)].slice(0, 20)));
  } catch { /* storage may be off */ }
}

export async function claimWalks(): Promise<number> {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    if (!ids.length) return 0;
    const res = await fetch("/api/auth/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walkIds: ids, sessionId: sessionId() }) });
    if (!res.ok) return 0;
    localStorage.removeItem(KEY);
    return ((await res.json()) as { claimed: number }).claimed;
  } catch { return 0; }
}

export type Me = { user: { email: string; plan: string; planStatus: string; planEndsAt: string | null } | null; allowance: { allowed: boolean; used: number; limit: number; plan: string; endsAt: string | null; next: "signin" | "plans" | null } };

export async function whoAmI(): Promise<Me | null> {
  try {
    const res = await fetch(`/api/auth/me?session=${encodeURIComponent(sessionId())}`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as Me) : null;
  } catch { return null; }
}
