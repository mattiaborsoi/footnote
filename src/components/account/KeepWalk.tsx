"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/client/events";
import { claimWalks, rememberWalk, whoAmI } from "@/lib/client/walks";

/** On a walk page: keep it in your account, or sign in to. The walk itself is yours to use either way. */
export default function KeepWalk({ walkId, owned }: { walkId: string; owned: boolean }) {
  const [state, setState] = useState<"unknown" | "out" | "in" | "kept">(owned ? "kept" : "unknown");
  useEffect(() => {
    if (owned) return;
    void whoAmI().then((me) => setState(me?.user ? "in" : "out"));
  }, [owned]);
  if (state === "unknown") return null;
  if (state === "kept") return <p className="text-[14px] text-muted">In your walks.</p>;
  if (state === "out") return <Link href={`/signin?next=/w/${walkId}`} onClick={() => rememberWalk(walkId)} className="flex min-h-12 items-center rounded-xl border-2 border-line px-4 font-semibold">Sign in to keep it</Link>;
  return (
    <button type="button" className="flex min-h-12 items-center rounded-xl border-2 border-line px-4 font-semibold" onClick={async () => { rememberWalk(walkId); const n = await claimWalks(); track("walk.keep", { claimed: n }, walkId); setState("kept"); }}>Keep this walk</button>
  );
}
