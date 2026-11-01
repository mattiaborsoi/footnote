"use client";
import { useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { sessionId, track } from "@/lib/client/events";

/** The bug button: one dialog, one message, context attached. Goes to our own table, never to GitHub. */
export default function Feedback({ screen, walkId }: { screen: string; walkId?: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const send = async () => {
    setState("sending");
    try {
      const res = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, contact: contact || undefined, screen, walkId, sessionId: sessionId(), context: { viewport: `${window.innerWidth}x${window.innerHeight}`, phone: window.innerWidth < 768, path: location.pathname } }) });
      setState(res.ok ? "sent" : "failed");
      if (res.ok) { track("feedback.sent", { screen }, walkId); setMessage(""); setContact(""); setTimeout(() => dlg.current?.close(), 1800); }
    } catch { setState("failed"); }
  };
  return (
    <>
      <button type="button" onClick={() => { setState("idle"); dlg.current?.showModal(); }} className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper text-muted shadow-md hover:text-text print:hidden" aria-label="Send feedback" title="Send feedback"><Icon.bug /></button>
      <dialog ref={dlg} className="m-auto w-[min(92vw,440px)] rounded-2xl border border-line bg-paper p-6 text-text backdrop:bg-black/40">
        {state === "sent" ? (
          <div className="flex flex-col gap-3" role="status"><h2 className="font-serif text-2xl font-medium">Thank you</h2><p className="text-[15px] text-muted">It is with us, with this screen and walk attached.</p></div>
        ) : (
        <form method="dialog" className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <h2 className="font-serif text-2xl font-medium">Send feedback</h2>
          <p className="text-[14px] text-muted">What went wrong, or what would make this better? The screen and the walk come with it.</p>
          <textarea name="message" className="min-h-28 rounded-xl border-[1.5px] border-line bg-paper p-3 text-[16px]" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && message.trim()) void send(); }} required maxLength={2000} aria-label="Your feedback" />
          <input name="contact" type="email" autoComplete="email" spellCheck={false} className="min-h-11 rounded-xl border-[1.5px] border-line bg-paper px-3 text-[16px]" placeholder="Email, only if you want a reply…" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} aria-label="Contact" />
          <div className="flex justify-end gap-2">
            <button type="button" className="min-h-11 rounded-xl border-2 border-line px-4 font-semibold hover:bg-soft" onClick={() => dlg.current?.close()}>Cancel</button>
            <button type="submit" className="min-h-11 rounded-xl bg-text px-4 font-semibold text-paper disabled:opacity-40" disabled={!message.trim() || state === "sending"}>{state === "failed" ? "Try again" : "Send"}</button>
          </div>
        </form>
        )}
      </dialog>
    </>
  );
}
