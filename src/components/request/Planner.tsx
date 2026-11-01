"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import RequestForm, { type FormState, type toRequest } from "@/components/request/RequestForm";
import WaitPanel, { type StageState } from "@/components/request/WaitPanel";
import { Icon } from "@/components/icons";
import Logo from "@/components/Logo";
import AccountChip from "@/components/account/AccountChip";
import { rememberWalk } from "@/lib/client/walks";
import { readSse } from "@/lib/client/sse";
import { sessionId, track } from "@/lib/client/events";

const WalkMap = dynamic(() => import("@/components/map/WalkMap"), { ssr: false });
type Req = ReturnType<typeof toRequest>;
type Cand = { id: string; lat: number; lon: number };
type Box = { south: number; west: number; north: number; east: number };

/** The home screen: the six questions beside the map; while a walk builds, the map fills and the stages tick; then the walk's page opens. */
export default function Planner({ initial, tailorOf }: { initial?: Partial<FormState>; tailorOf?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [stages, setStages] = useState<StageState[]>([]);
  const [facts, setFacts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<{ message: string; next: "signin" | "plans" | null; plan: string } | null>(null);
  const [cands, setCands] = useState<Cand[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [box, setBox] = useState<Box | null>(null);
  const [start, setStart] = useState<{ lat: number; lon: number } | null>(null);
  const [snakes, setSnakes] = useState<{ lat: number; lon: number }[][]>([]);
  const [considered, setConsidered] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [end, setEnd] = useState<{ lat: number; lon: number } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [cities, setCities] = useState<{ id: string; name: string; lat: number; lon: number }[]>([]);
  const [startFrom, setStartFrom] = useState<string | undefined>(undefined);
  useEffect(() => { fetch("/api/cities").then((r) => r.json()).then((j: { cities?: typeof cities }) => setCities(j.cities ?? [])).catch(() => null); }, []);
  const pickCity = useCallback((name: string) => { setStartFrom(name); track("request.city_pin", {}); }, []);

  const submit = useCallback(async (req: Req) => {
    setBusy(true); setError(null); setLimit(null); setStages([]); setFacts([]); setCands([]); setChosen([]); setBox(null); setStart(null); setEnd(null); setSnakes([]); setConsidered([]); setRevealed(0);
    const t0 = Date.now();
    setStartedAt(t0);
    try {
      const url = tailorOf ? `/api/walk/${tailorOf}/tailor` : "/api/walk";
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req, sessionId: sessionId() }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "The request was refused.");
      await readSse(res, (event, data) => {
        if (event === "stage") {
          const s = data as StageState & { detail: Record<string, unknown> };
          setStages((prev) => [...prev, s]);
          if (s.stage === "understood") {
            setStart((s.detail.start as { lat: number; lon: number }) ?? null); setEnd((s.detail.end as { lat: number; lon: number } | null) ?? null);
          }
          if (s.stage === "searching") {
            const d = s.detail;
            setCands((d.candidates as Cand[]) ?? []); setBox((d.bbox as Box) ?? null); setStart((d.start as { lat: number; lon: number }) ?? null); setEnd((d.end as { lat: number; lon: number } | null) ?? null);
            setFacts((d.sample as string[]) ?? []);
          }
          if (s.stage === "probing") { setSnakes((s.detail.paths as { lat: number; lon: number }[][]) ?? []); setConsidered((s.detail.targets as string[]) ?? []); }
          if (s.stage === "choosing") {
            const ids = (s.detail.stops as string[]) ?? [];
            setSnakes([]); setChosen(ids);
            // pins land one by one, in walk order
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            ids.forEach((_, i) => setTimeout(() => setRevealed(i + 1), reduced ? 0 : 350 * (i + 1)));
          }
        } else if (event === "walk") {
          const w = data as { id?: string | null; totalMinutes: number };
          track("walk.received", { ms: Date.now() - t0, totalMinutes: w.totalMinutes }, w.id ?? undefined);
          if (w.id) { rememberWalk(w.id); router.push(`/w/${w.id}`); }
          else { setError("The walk was built but could not be saved."); setBusy(false); }
        } else if (event === "error") {
          const d = data as { message: string; code?: string; next?: "signin" | "plans" | null; allowance?: { plan?: string } };
          if (d.code === "limit") { setLimit({ message: d.message, next: d.next ?? null, plan: d.allowance?.plan ?? "none" }); track("walk.limited_ui", { next: d.next ?? "" }); }
          else { setError(d.message); track("walk.failed", { ms: Date.now() - t0 }); }
          setBusy(false);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }, [router, tailorOf]);

  const chosenStops = useMemo(() => chosen.slice(0, revealed).map((id, i) => { const c = cands.find((x) => x.id === id); return c ? { id, name: `Stop ${i + 1}`, category: "place", lat: c.lat, lon: c.lon } : null; }).filter((x): x is NonNullable<typeof x> => !!x), [chosen, cands, revealed]);

  return (
    <div className="flex min-h-dvh flex-col-reverse justify-end md:flex-row md:justify-start">
      <section className="flex flex-col gap-6 px-6 py-8 md:w-[520px] md:flex-none md:overflow-y-auto md:px-10 md:py-10 lg:w-[600px]">
        <header className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
          <AccountChip />
          {tailorOf ? <span className="text-[13px] text-muted">Tailoring a ready-made walk</span> : <Link href="/around" className="flex min-h-10 items-center gap-2 rounded-full border-2 border-line px-3 text-[14px] font-semibold text-ink"><Icon.locate width={16} height={16} />Around me</Link>}
          </div>
        </header>
        {limit ? (
          <section className="flex flex-col gap-4 rounded-2xl bg-soft p-5" role="status">
            <h2 className="font-serif text-[24px] leading-tight">{limit.plan === "none" ? "That was your free walk" : "No walks left on this pass"}</h2>
            <p className="text-[15px] text-muted">{limit.message} Every walk is built fresh by a large model and a router, which costs real computing; a pass covers a set number of them, and that is the whole business.</p>
            <div className="flex flex-wrap gap-3">
              {limit.next === "signin" ? <Link href="/signin?next=/" className="flex min-h-12 items-center rounded-xl bg-text px-4 font-semibold text-paper">Sign in</Link> : null}
              <Link href="/plans" className={`flex min-h-12 items-center rounded-xl px-4 font-semibold ${limit.next === "signin" ? "border-2 border-line" : "bg-text text-paper"}`}>See the passes</Link>
              <button type="button" className="flex min-h-12 items-center rounded-xl border-2 border-line px-4 font-semibold" onClick={() => setLimit(null)}>Back</button>
            </div>
          </section>
        ) : null}
        {busy || error ? <WaitPanel stages={stages} facts={facts} startedAt={startedAt} error={error} revealed={revealed} total={chosen.length} /> : null}
        <div className={busy ? "hidden md:block md:opacity-50" : limit ? "hidden" : ""}>
          <RequestForm onSubmit={submit} busy={busy} initial={initial} startFrom={startFrom} />
        </div>
        {error ? <button type="button" className="min-h-12 rounded-2xl border-2 border-line font-semibold" onClick={() => setError(null)}>Try again</button> : null}
      </section>
      <aside className={`relative flex-1 bg-map md:sticky md:top-0 md:block md:h-dvh md:self-start ${busy || error ? "min-h-[320px]" : "hidden"}`} aria-label="Map">
        {start ? <WalkMap start={start} end={end} candidates={cands} stops={chosenStops} searchBox={box} snakes={busy ? snakes : []} considered={considered} dim={busy && !chosen.length} className="absolute inset-0" />
          : !busy && cities.length ? (
            <>
              <WalkMap cities={cities} onCityClick={pickCity} className="absolute inset-0" />
              <p className="pointer-events-none absolute left-3 top-3 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-[#141413] shadow">Cities we know well. Tap one to start there.</p>
            </>
          ) : null}
      </aside>
    </div>
  );
}
