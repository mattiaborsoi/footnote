"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Scout a city now, or run one scheduler round; both go through the existing admin route with the dashboard's cookie. */
export default function CityActions({ city }: { city?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const run = async (body: object) => {
    setState("busy");
    const res = await fetch("/api/admin/scout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setState(res.ok ? "done" : "failed"); router.refresh();
  };
  const cls = "min-h-9 rounded-lg border-2 border-line px-3 text-[13px] font-semibold disabled:opacity-40";
  return (
    <span className="flex items-center gap-2">
      {city ? <button type="button" className={cls} disabled={state === "busy"} onClick={() => run({ city })}>Scout now</button> : <button type="button" className={cls} disabled={state === "busy"} onClick={() => run({ tick: true })}>Run one scheduler round</button>}
      <span className="text-[12px] text-muted">{state === "busy" ? "running, minutes…" : state === "done" ? "done" : state === "failed" ? "failed" : ""}</span>
    </span>
  );
}
