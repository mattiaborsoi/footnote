"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { claimWalks } from "@/lib/client/walks";

/** The emailed link lands here; one tap spends it, so a mail scanner that opens the link signs nobody in. */
export default function LinkContinue({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setError(null);
    const res = await fetch("/api/auth/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const json = (await res.json().catch(() => ({}))) as { error?: string; next?: string | null };
    if (!res.ok) { setError(json.error ?? "That link did not work."); setBusy(false); return; }
    await claimWalks();
    router.replace(json.next ?? "/account");
    router.refresh();
  };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-[30px] leading-tight tracking-tight">Finish signing in</h1>
      <p className="text-[16px] text-muted">One tap and you are in on this device.</p>
      {error ? <p role="alert" className="rounded-xl bg-soft px-4 py-3 text-[14px] font-medium text-amber">{error}</p> : null}
      <button type="button" onClick={go} disabled={busy || !token} className="min-h-[52px] rounded-2xl bg-text font-semibold text-paper disabled:opacity-40">{busy ? "Signing in…" : "Continue"}</button>
    </div>
  );
}
