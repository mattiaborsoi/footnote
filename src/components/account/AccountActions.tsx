"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Manage billing (Stripe's portal) and sign out. */
export default function AccountActions({ hasBilling }: { hasBilling: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const portal = async () => {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.ok && json.url) location.assign(json.url); else setError(json.error ?? "Could not open billing.");
  };
  const signOut = async () => { await fetch("/api/auth/signout", { method: "POST" }); router.replace("/"); router.refresh(); };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {hasBilling ? <button type="button" onClick={portal} className="flex min-h-12 items-center rounded-xl border-2 border-line px-4 font-semibold">Manage billing</button> : null}
        <button type="button" onClick={signOut} className="flex min-h-12 items-center rounded-xl border-2 border-line px-4 font-semibold">Sign out</button>
      </div>
      {error ? <p role="alert" className="text-[14px] font-medium text-amber">{error}</p> : null}
    </div>
  );
}
