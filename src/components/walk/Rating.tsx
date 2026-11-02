"use client";
import { useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { track } from "@/lib/client/events";

const REASONS = ["Wrong stops", "Too long", "Closed places", "Stories off", "Something else"];
const key = (id: string) => `footnote.rating.${id}`;
const subscribeStorage = (cb: () => void) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); };
const readRating = (id: string): "up" | "down" | null => { try { const v = localStorage.getItem(key(id)); return v === "up" || v === "down" ? v : null; } catch { return null; } };

/** One tap tells us whether the walk was worth it; a thumbs down asks why, in one more tap. Stored as events, remembered in this browser. */
export default function Rating({ walkId }: { walkId: string }) {
  // The remembered choice comes from the browser's storage after hydration (the server has none), so both sides render the same first frame.
  const remembered = useSyncExternalStore(subscribeStorage, () => readRating(walkId), () => null);
  const [chosen, setChosen] = useState<"up" | "down" | null>(null);
  const value = chosen ?? remembered;
  const [reason, setReason] = useState<string | null>(null);
  const rate = (v: "up" | "down") => {
    setChosen(v); setReason(null);
    try { localStorage.setItem(key(walkId), v); } catch { /* fine */ }
    track("walk.rating", { value: v }, walkId);
  };
  const why = (r: string) => { setReason(r); track("walk.rating_reason", { reason: r }, walkId); };
  const btn = (on: boolean) => `press flex h-11 w-11 items-center justify-center rounded-full border-2 ${on ? "border-ink bg-ink text-white" : "border-line hover:bg-soft"}`;
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-soft p-4" aria-labelledby="rating-q">
      <div className="flex items-center gap-3">
        <p id="rating-q" className="flex-1 text-[15px] font-medium">{value === "up" ? "Glad it was. Thank you." : value === "down" && reason ? "Thank you, that helps us fix it." : value === "down" ? "Sorry. What was off?" : "Was this walk worth it?"}</p>
        <button type="button" className={btn(value === "up")} aria-pressed={value === "up"} aria-label="Yes, a good walk" onClick={() => rate("up")}><Icon.up width={20} height={20} /></button>
        <button type="button" className={btn(value === "down")} aria-pressed={value === "down"} aria-label="No, not this one" onClick={() => rate("down")}><Icon.down width={20} height={20} /></button>
      </div>
      {value === "down" && !reason ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="What was off">
          {REASONS.map((r) => <button type="button" key={r} className="press min-h-10 rounded-full border-2 border-line bg-paper px-3 text-[14px] font-medium hover:bg-soft" onClick={() => why(r)}>{r}</button>)}
        </div>
      ) : null}
    </section>
  );
}
