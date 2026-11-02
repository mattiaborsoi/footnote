"use client";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client/http";
import { useState } from "react";
import { btn } from "@/components/ui";

/** Manage billing (Stripe's portal) and sign out. */
export default function AccountActions({ hasBilling }: { hasBilling: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const portal = async () => {
    try { const { url } = await postJson<{ url?: string }>("/api/billing/portal"); if (url) location.assign(url); else throw new Error("Could not open billing."); } catch (e) { setError(e instanceof Error ? e.message : "Could not open billing."); }
  };
  const signOut = async () => { await fetch("/api/auth/signout", { method: "POST" }); router.replace("/"); router.refresh(); };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {hasBilling ? <button type="button" onClick={portal} className={btn.secondary}>Manage billing</button> : null}
        <button type="button" onClick={signOut} className={btn.secondary}>Sign out</button>
      </div>
      {error ? <p role="alert" className="text-[14px] font-medium text-amber">{error}</p> : null}
    </div>
  );
}
