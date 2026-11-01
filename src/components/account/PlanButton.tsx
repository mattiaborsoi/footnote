"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/client/events";

/** Starts Checkout for one plan; sends a signed-out person to sign in first and back here after. */
export default function PlanButton({ plan, label, ready }: { plan: "week" | "month"; label: string; ready: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setError(null); track("plans.choose", { plan });
    const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.status === 401) { router.push("/signin?next=/plans"); return; }
    if (res.ok && json.url) { location.assign(json.url); return; }
    setError(json.error ?? "Could not start the payment."); setBusy(false);
  };
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={go} disabled={busy || !ready} className="min-h-[52px] rounded-2xl bg-text px-5 font-semibold text-paper disabled:opacity-40">{busy ? "One moment…" : label}</button>
      {!ready ? <p className="text-[13px] text-muted">Payments are not switched on here yet.</p> : null}
      {error ? <p role="alert" className="text-[14px] font-medium text-amber">{error}</p> : null}
    </div>
  );
}
