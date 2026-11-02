"use client";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client/http";
import { useState } from "react";
import { claimWalks } from "@/lib/client/walks";
import { alert, btn } from "@/components/ui";

/** The emailed link lands here; one tap spends it, so a mail scanner that opens the link signs nobody in. */
export default function LinkContinue({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setError(null);
    let json: { next?: string | null };
    try { json = await postJson<{ next?: string | null }>("/api/auth/link", { token }); } catch (e) { setError(e instanceof Error ? e.message : "That link did not work."); setBusy(false); return; }
    await claimWalks();
    router.replace(json.next ?? "/account");
    router.refresh();
  };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-[30px] leading-tight tracking-tight">Finish signing in</h1>
      <p className="text-[16px] text-muted">One tap and you are in on this device.</p>
      {error ? <p role="alert" className={alert}>{error}</p> : null}
      <button type="button" onClick={go} disabled={busy || !token} className={btn.big}>{busy ? "Signing in…" : "Continue"}</button>
    </div>
  );
}
