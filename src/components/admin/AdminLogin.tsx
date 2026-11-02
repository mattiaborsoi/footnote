"use client";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client/http";
import { useState } from "react";
import { btn } from "@/components/ui";

export default function AdminLogin() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await postJson("/api/admin/login", { token }); router.replace("/admin"); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Could not sign in."); setBusy(false); }
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={go}>
      <h1 className="font-serif text-[30px] leading-tight tracking-tight">Dashboard</h1>
      <p className="text-[15px] text-muted">The admin token from this machine&apos;s environment file.</p>
      <label className="flex flex-col gap-1 text-[12px] font-semibold uppercase tracking-wider text-muted">Token
        <input className="min-h-12 w-full rounded-xl border-[1.5px] border-line bg-paper px-4 text-[17px] normal-case tracking-normal" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} autoFocus required />
      </label>
      {error ? <p role="alert" className="text-[14px] font-medium text-amber">{error}</p> : null}
      <button type="submit" disabled={busy} className={btn.big}>Open</button>
    </form>
  );
}
