"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

export type StageState = { stage: string; ms?: number; detail?: Record<string, unknown> };
const LABELS: Record<string, string> = { understood: "Understood", searching: "Searching nearby", choosing: "Choosing stops", routing: "Walking the route" };
const ORDER = ["understood", "searching", "choosing", "routing"];

/** Four honest stages with their real timings, a rotating fact from the candidates, and a note when it is slow. */
export default function WaitPanel({ stages, facts, startedAt, error, revealed = 0, total = 0 }: { stages: StageState[]; facts: string[]; startedAt: number; error?: string | null; revealed?: number; total?: number }) {
  const [elapsed, setElapsed] = useState(0);
  const [factIx, setFactIx] = useState(0);
  useEffect(() => { const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000); return () => clearInterval(t); }, [startedAt]);
  useEffect(() => { if (!facts.length) return; const t = setInterval(() => setFactIx((i) => (i + 1) % facts.length), 5000); return () => clearInterval(t); }, [facts]);
  const done = new Map(stages.filter((s) => ORDER.includes(s.stage)).map((s) => [s.stage, s]));
  const current = ORDER.find((s) => !done.has(s)) ?? null;
  const detailFor = (s: string) => {
    const d = done.get(s)?.detail;
    if (!d) return "";
    if (s === "understood") return `${(d.start as { label?: string } | undefined)?.label?.split(",")[0] ?? ""}: ${d.minutes} min, ${d.pace} pace, ${(d.interests as string[] | undefined)?.join(", ") ?? ""}`;
    if (s === "searching") return `${d.kept} places worth a look${d.cached ? ", from the city cache" : ""}`;
    if (s === "choosing") return total ? `${Math.min(revealed, total)} of ${total} stops` : "";
    if (s === "routing") return `${d.totalMinutes} minutes door to door`;
    return "";
  };
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <h2 className="font-serif text-2xl font-medium tracking-tight">{error ? "That didn't work" : "Building your walk"}</h2>
      {error ? <p className="rounded-xl bg-soft p-4 text-[15px]">{error}</p> : null}
      <ol className="flex flex-col gap-3 text-[15px]">
        {ORDER.map((s) => {
          const d = done.get(s);
          const active = current === s && !error;
          return (
            <li key={s} className={`flex items-center gap-3 ${!d && !active ? "text-muted" : ""}`}>
              {d ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white"><Icon.check width={14} height={14} /></span>
                : active ? <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink"><span className="fn-breathe h-2.5 w-2.5 rounded-full bg-ink" /></span>
                : <span className="h-6 w-6 rounded-full border-2 border-line" />}
              <span className={`flex-1 ${active ? "font-semibold" : ""}`}>{LABELS[s]}{d ? <span className="font-normal text-muted">: {detailFor(s)}</span> : null}</span>
              {d?.ms !== undefined ? <span className="tabular text-[13px] text-muted">{d.detail?.cached && d.ms === 0 ? "from cache" : d.ms < 1000 ? "<1 s" : `${Math.round(d.ms / 1000)} s`}</span> : null}
            </li>
          );
        })}
      </ol>
      {!error && facts.length ? <p className="rounded-xl bg-soft p-4 text-[14px] leading-relaxed">{facts[factIx]}</p> : null}
      {!error && elapsed > 20 ? <p className="text-[13px] text-muted">{elapsed > 40 ? "Still working. The model is taking its time today." : "Nearly there."}</p> : null}
    </div>
  );
}
