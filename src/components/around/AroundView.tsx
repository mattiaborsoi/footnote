"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Feedback from "@/components/Feedback";
import { Icon } from "@/components/icons";
import { sessionId, track } from "@/lib/client/events";
import type { Option } from "@/lib/pipeline/around";
import { btn } from "@/components/ui";

const WalkMap = dynamic(() => import("@/components/map/WalkMap"), { ssr: false });

/** One tap: your location, 45 minutes, your interests, now. A fan of options, not a route. */
export default function AroundView() {
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [options, setOptions] = useState<Option[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const load = useCallback(async (p: { lat: number; lon: number }) => {
    setError(null);
    const res = await fetch("/api/around", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, language: navigator.language.split("-")[0], sessionId: sessionId() }) });
    if (!res.ok) { setError("Could not look around here."); return; }
    const data = (await res.json()) as { options: Option[] };
    setOptions(data.options);
    setActive(data.options[0]?.id ?? null);
    track("around.view", { options: data.options.length });
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) { setError("Location needs a secure (https) connection or localhost."); return; }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (g) => { const p = { lat: g.coords.latitude, lon: g.coords.longitude }; setPos(p); void load(p); },
      () => setError("Allow location access to see what is around you."), { timeout: 10_000 },
    );
  }, [load]);
  useEffect(() => { const t = setTimeout(locate, 0); return () => clearTimeout(t); }, [locate]);

  const stops = (options ?? []).map((o) => ({ id: o.id, name: o.name, category: o.category, lat: o.lat, lon: o.lon, closed: o.open === "closed" }));
  const spokes = pos ? (options ?? []).map((o) => [pos, { lat: o.lat, lon: o.lon }] as [typeof pos, { lat: number; lon: number }]) : [];

  return (
    <div className="flex min-h-dvh flex-col md:flex-row-reverse">
      <aside className="relative h-[50dvh] flex-none bg-map md:h-dvh md:flex-1 md:sticky md:top-0" aria-label="Map of what is around you">
        <WalkMap start={pos} stops={stops} spokes={spokes} activeId={active} onStopClick={setActive} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
          <Link href="/" className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#141413] shadow" aria-label="Back"><Icon.back width={20} height={20} /></Link>
          <span className="pointer-events-auto flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-[#141413] shadow"><Icon.locate width={16} height={16} className="text-[#1e3a8a]" />Around me, 45 min, now</span>
        </div>
      </aside>
      <main className="flex flex-col gap-4 px-6 py-6 md:w-[520px] md:flex-none md:px-10 md:py-10">
        <h1 className="font-serif text-[26px] tracking-tight">{options ? `${options.length} within ten minutes` : error ? "Where are you?" : "Finding what is around you…"}</h1>
        {error ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-soft p-5">
            <p className="text-[15px] text-muted">Around me needs your location to find what is near you.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={locate} className="flex min-h-12 items-center gap-2 rounded-xl bg-text px-4 font-semibold text-paper"><Icon.locate width={18} height={18} />Use my location</button>
              <Link href="/" className={btn.secondary}>Or plan a walk from a place</Link>
            </div>
          </div>
        ) : null}
        {options?.length === 0 ? <p className="text-muted">Nothing worth a story within ten minutes here. Try a walk instead.</p> : null}
        <ol className="flex flex-col gap-3">
          {(options ?? []).map((o, i) => (
            <li key={o.id} className={`flex flex-col gap-2 rounded-2xl border-2 p-4 ${active === o.id ? "border-text" : "border-line"}`} onMouseEnter={() => setActive(o.id)}>
              <div className="flex justify-between text-[13px] text-muted"><span>{i + 1}. {o.category}</span><span className="font-semibold text-ink">{o.minutes} min{o.hoursNote ? ` · ${o.hoursNote}` : ""}</span></div>
              <h2 className="font-serif text-[20px]">{o.name}</h2>
              {o.hook ? <p className="text-[14px] leading-snug text-muted">{o.hook}</p> : null}
              <div className="mt-1 flex gap-2">
                <a href={`https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${o.lat.toFixed(6)},${o.lon.toFixed(6)}`} target="_blank" rel="noopener" onClick={() => track("around.go", { index: i })} className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-text font-semibold text-paper">Go</a>
                {pos ? <Link href={`/?start=${pos.lat.toFixed(5)},${pos.lon.toFixed(5)}&minutes=45`} onClick={() => track("around.walk", { index: i })} className="flex min-h-11 flex-[1.4] items-center justify-center rounded-xl border-2 border-line font-semibold">Make this a walk</Link> : null}
              </div>
            </li>
          ))}
        </ol>
      </main>
      <Feedback screen="around" />
    </div>
  );
}
