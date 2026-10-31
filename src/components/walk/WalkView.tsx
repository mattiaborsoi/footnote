"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Feedback from "@/components/Feedback";
import { Icon } from "@/components/icons";
import { track, whenString } from "@/lib/client/events";
import type { StoredWalk } from "@/lib/walks";

const WalkMap = dynamic(() => import("@/components/map/WalkMap"), { ssr: false });

/** The walk as a page: the map overlay above, the stops below, with exports, a date re-check, tailoring and feedback. */
export default function WalkView({ initial }: { initial: StoredWalk }) {
  const [walk, setWalk] = useState(initial);
  const [active, setActive] = useState<string | null>(initial.stops[0]?.id ?? null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { track("walk.view", { stops: initial.stops.length }, initial.id); }, [initial.id, initial.stops.length]);

  const stops = useMemo(() => walk.stops.map((s, i) => ({ id: s.id, name: s.name, category: s.category, lat: s.lat, lon: s.lon, closed: s.open === "closed", minutesFromPrevious: walk.legs?.[i] ? Math.max(1, Math.round(walk.legs[i].durationS / 60)) : undefined })), [walk]);
  const gpxHref = useMemo(() => `data:application/gpx+xml;charset=utf-8,${encodeURIComponent(walk.gpx)}`, [walk.gpx]);
  const km = (walk.distanceM / 1000).toFixed(1);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/walk/${walk.id}/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ when: whenString(date, time) }) });
      if (res.ok) { setWalk({ ...(await res.json()), id: walk.id, createdAt: walk.createdAt }); track("walk.refresh", {}, walk.id); }
    } finally { setRefreshing(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); track("walk.copy", {}, walk.id); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } };

  return (
    <div className="flex min-h-dvh flex-col md:flex-row-reverse">
      <aside className="relative h-[46dvh] flex-none bg-map md:h-dvh md:flex-1 md:sticky md:top-0" aria-label="Map of the walk">
        <WalkMap start={walk.start} end={walk.end} route={walk.route} stops={stops} activeId={active} onStopClick={(id) => { setActive(id); document.getElementById(`stop-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
          <Link href="/" className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#141413] shadow" aria-label="Back to the start"><Icon.back width={20} height={20} /></Link>
          <span className="pointer-events-auto flex min-h-10 items-center rounded-full bg-white px-4 text-[14px] font-semibold text-[#141413] shadow">{walk.totalMinutes} min · {km} km · {walk.steps.toLocaleString()} steps</span>
          {walk.weather ? <span className="pointer-events-auto flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] text-[#3d3c39] shadow"><Icon.rain width={16} height={16} className="text-[#1e3a8a]" />{walk.weather.summary}</span> : null}
        </div>
      </aside>

      <main className="flex flex-col gap-6 px-6 py-7 md:w-[520px] md:flex-none md:px-10 md:py-10 lg:w-[600px]">
        <header className="flex flex-col gap-2">
          <p className="text-[12px] uppercase tracking-[0.2em] text-muted">Footnote{walk.startsAt ? ` · ${walk.startsAt.replace("T", " ")}` : ""}</p>
          <h1 className="font-serif text-[34px] leading-[1.1] tracking-tight">{walk.title}</h1>
          <p className="text-[16px] leading-relaxed text-muted">{walk.summary}</p>
        </header>

        <div className="flex flex-wrap gap-2">
          <a href={walk.googleMapsUrl} target="_blank" rel="noopener" onClick={() => track("walk.export", { kind: "google" }, walk.id)} className="flex min-h-12 items-center rounded-xl bg-text px-4 font-semibold text-paper">Open in Google Maps</a>
          <a href={gpxHref} download={`${walk.title.replace(/[^\w]+/g, "-").toLowerCase()}.gpx`} onClick={() => track("walk.export", { kind: "gpx" }, walk.id)} className="flex min-h-12 items-center rounded-xl border-2 border-line px-4 font-semibold">GPX</a>
          <button type="button" onClick={copy} className="flex min-h-12 items-center rounded-xl border-2 border-line px-4 font-semibold">{copied ? "Link copied" : "Copy link"}</button>
          <Link href={`/tailor?of=${walk.id}`} className="flex min-h-12 items-center rounded-xl border-2 border-line px-4 font-semibold">Tailor it</Link>
          <Link href={`/w/${walk.id}/footnoted`} onClick={() => track("walk.footnoted", {}, walk.id)} className="flex min-h-12 items-center rounded-xl border-2 border-line px-4 font-semibold">Footnoted page</Link>
        </div>

        <form className="flex flex-wrap items-center gap-2 rounded-xl bg-soft p-3 text-[14px]" onSubmit={(e) => { e.preventDefault(); void refresh(); }}>
          <span className="text-muted">Re-check hours and weather for</span>
          <input type="date" className="min-h-10 rounded-lg border-[1.5px] border-line bg-paper px-2" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" required />
          <input type="time" className="min-h-10 rounded-lg border-[1.5px] border-line bg-paper px-2" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" />
          <button type="submit" className="min-h-10 rounded-lg border-2 border-line px-3 font-semibold disabled:opacity-40" disabled={refreshing || !date}>{refreshing ? "Checking…" : "Check"}</button>
        </form>

        <ol className="flex flex-col gap-5">
          {walk.stops.map((s, i) => {
            const isOpen = !!open[s.id];
            return (
              <li key={s.id} id={`stop-${s.id}`} className={`flex gap-4 rounded-2xl p-3 transition-colors ${active === s.id ? "bg-soft" : ""}`} onMouseEnter={() => setActive(s.id)}>
                <button type="button" onClick={() => setActive(s.id)} className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-[14px] font-semibold text-[#1e3a8a]" style={{ boxShadow: `0 0 0 3px ${s.open === "closed" ? "#9c9a94" : "var(--halo, #1e3a8a)"}` }} aria-label={`Show stop ${i + 1} on the map`}>{i + 1}</button>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                    {s.arrival ? <span>arrive {s.arrival}</span> : null}
                    {s.hoursNote ? <span className={s.open === "closed" ? "flex items-center gap-1 font-semibold text-[#8a3b12]" : "text-ink"}>{s.open === "closed" ? <Icon.clock width={14} height={14} /> : null}{s.hoursNote}</span> : null}
                  </p>
                  <h2 className="font-serif text-[24px] leading-tight">{s.name}</h2>
                  <p className="text-[16px] leading-snug">{s.hook}</p>
                  {isOpen ? (
                    <>
                      <p className="text-[14px] leading-relaxed text-muted">{s.story}</p>
                      <p className="text-[14px] leading-relaxed"><strong className="text-ink">Why it&apos;s here for you</strong> — {s.why}</p>
                      {s.sources?.length ? <p className="text-[12px] text-muted">Recommended on {s.sources.map((src, j) => <span key={src.url}>{j > 0 ? ", " : ""}<a className="underline" href={src.url} target="_blank" rel="nofollow noopener">{src.title}</a></span>)}</p> : null}
                    </>
                  ) : null}
                  <button type="button" className="self-start text-[14px] font-semibold text-ink" onClick={() => { setOpen((o) => ({ ...o, [s.id]: !isOpen })); if (!isOpen) track("stop.open", { index: i }, walk.id); }} aria-expanded={isOpen}>{isOpen ? "Less" : "Read more"}</button>
                </div>
              </li>
            );
          })}
        </ol>
        <footer className="text-[12px] text-muted">Map data © OpenStreetMap contributors · stories from Wikipedia and the linked sources · built with Claude</footer>
      </main>
      <Feedback screen="walk" walkId={walk.id} />
    </div>
  );
}
