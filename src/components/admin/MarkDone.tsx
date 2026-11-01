"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** A done tick kept in the local database, so it survives a fresh pull of the mirror. */
export default function MarkDone({ kind, id, done }: { kind: string; id: string; done: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    await fetch("/api/admin/mark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, key: id, on: !done }) });
    router.refresh(); setBusy(false);
  };
  return <button type="button" onClick={toggle} disabled={busy} className={`min-h-9 rounded-lg border-2 px-3 text-[13px] font-semibold ${done ? "border-[#2e7d32] text-[#2e7d32]" : "border-line"}`}>{done ? "Done" : "Mark done"}</button>;
}
