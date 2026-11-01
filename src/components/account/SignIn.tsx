"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/client/events";
import { claimWalks } from "@/lib/client/walks";

const input = "min-h-12 w-full rounded-xl border-[1.5px] border-line bg-paper px-4 text-[17px]";

/** Email, then the six-digit code from it. No passwords. */
export default function SignIn({ next }: { next: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [masked, setMasked] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as { error?: string; masked?: string; next?: string | null };
    if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
    return json;
  };
  const start = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { const r = await post("/api/auth/start", { email, next }); setMasked(r.masked ?? email); track("auth.code_sent"); }
    catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setBusy(false); }
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const r = await post("/api/auth/verify", { email, code });
      const claimed = await claimWalks();
      track("auth.signed_in", { claimed });
      router.replace(r.next ?? next ?? "/account");
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      {masked ? (
        <form className="flex flex-col gap-4" onSubmit={verify}>
          <h1 className="font-serif text-[30px] leading-tight tracking-tight">Check your email</h1>
          <p className="text-[16px] text-muted">We sent a six-digit code to {masked}. Type it here, or open the link in the email on this device.</p>
          <label className="flex flex-col gap-1 text-[13px] font-medium text-muted">Code
            <input className={`${input} tracking-[0.3em]`} inputMode="numeric" spellCheck={false} autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} autoFocus required />
          </label>
          {error ? <p role="alert" className="rounded-xl bg-soft px-4 py-3 text-[14px] font-medium text-amber">{error}</p> : null}
          <button type="submit" className="min-h-[52px] rounded-2xl bg-text font-semibold text-paper disabled:opacity-40" disabled={busy || code.replace(/\D/g, "").length < 6}>{busy ? "Checking…" : "Sign in"}</button>
          <button type="button" className="self-start text-[14px] font-semibold text-ink" onClick={() => { setMasked(null); setCode(""); setError(null); }}>Use a different address</button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={start}>
          <h1 className="font-serif text-[30px] leading-tight tracking-tight">Sign in</h1>
          <p className="text-[16px] text-muted">Your email, a code, no password. Signing in keeps your walks and unlocks a pass.</p>
          <label className="flex flex-col gap-1 text-[13px] font-medium text-muted">Email
            <input className={input} type="email" spellCheck={false} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
          </label>
          {error ? <p role="alert" className="rounded-xl bg-soft px-4 py-3 text-[14px] font-medium text-amber">{error}</p> : null}
          <button type="submit" className="min-h-[52px] rounded-2xl bg-text font-semibold text-paper disabled:opacity-40" disabled={busy}>{busy ? "Sending…" : "Email me a code"}</button>
          <p className="text-[13px] text-muted">By signing in you agree to the <Link className="underline" href="/terms">terms</Link>; the <Link className="underline" href="/privacy">privacy notice</Link> says what we keep.</p>
        </form>
      )}
    </div>
  );
}
