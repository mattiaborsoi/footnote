"use client";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client/http";
import { useState } from "react";
import { track } from "@/lib/client/events";
import { btn } from "@/components/ui";

/** Starts Checkout for one plan; sends a signed-out person to sign in first and back here after. */
export default function PlanButton({ plan, label, ready }: { plan: "week" | "month"; label: string; ready: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setError(null); track("plans.choose", { plan });
    try {
      const { url } = await postJson<{ url?: string }>("/api/billing/checkout", { plan });
      if (url) { location.assign(url); return; }
      throw new Error("Could not start the payment.");
    } catch (e) {
      if ((e as { status?: number }).status === 401) { router.push("/signin?next=/plans"); return; }
      setError(e instanceof Error ? e.message : "Could not start the payment."); setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={go} disabled={busy || !ready} className={`${btn.big} px-5`}>{busy ? "One moment…" : label}</button>
      {!ready ? <p className="text-[13px] text-muted">Payments are not switched on here yet.</p> : null}
      {error ? <p role="alert" className="text-[14px] font-medium text-amber">{error}</p> : null}
    </div>
  );
}
