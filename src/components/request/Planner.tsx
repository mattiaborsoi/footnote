"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import RequestForm, { type FormState, type toRequest } from "@/components/request/RequestForm";
import WaitPanel, { type StageState } from "@/components/request/WaitPanel";
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
  const [cands, setCands] = useState<Cand[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [box, setBox] = useState<Box | null>(null);
  const [start, setStart] = useState<{ lat: number; lon: number } | null>(null);
  const [end, setEnd] = useState<{ lat: number; lon: number } | null>(null);
  const [startedAt, setStartedAt] = useState(0);

  const submit = useCallback(async (req: Req) => {
    setBusy(true); setError(null); setStages([]); setFacts([]); setCands([]); setChosen([]); setBox(null); setStart(null); setEnd(null);
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
          if (s.stage === "choosing") setChosen((s.detail.stops as string[]) ?? []);
        } else if (event === "walk") {
          const w = data as { id?: string | null; totalMinutes: number };
          track("walk.received", { ms: Date.now() - t0, totalMinutes: w.totalMinutes }, w.id ?? undefined);
          if (w.id) router.push(`/w/${w.id}`);
          else { setError("The walk was built but could not be saved."); setBusy(false); }
        } else if (event === "error") {
          setError((data as { message: string }).message);
          track("walk.failed", { ms: Date.now() - t0 });
          setBusy(false);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }, [router, tailorOf]);

  const chosenStops = chosen.map((id, i) => { const c = cands.find((x) => x.id === id); return c ? { id, name: `Stop ${i + 1}`, category: "place", lat: c.lat, lon: c.lon } : null; }).filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <section className="flex flex-col gap-6 px-6 py-8 md:w-[520px] md:flex-none md:overflow-y-auto md:px-10 md:py-10 lg:w-[600px]">
        <header className="flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">Footnote</Link>
          <span className="text-[13px] text-muted">{tailorOf ? "Tailoring a ready-made walk" : "A walk designed around you"}</span>
        </header>
        {busy || error ? <WaitPanel stages={stages} facts={facts} startedAt={startedAt} error={error} /> : null}
        <div className={busy ? "hidden md:block md:opacity-50" : ""}>
          <RequestForm onSubmit={submit} busy={busy} initial={initial} />
        </div>
        {error ? <button type="button" className="min-h-12 rounded-2xl border-2 border-line font-semibold" onClick={() => setError(null)}>Try again</button> : null}
      </section>
      <aside className="relative min-h-[320px] flex-1 bg-map md:min-h-dvh" aria-label="Map">
        <WalkMap start={start} end={end} candidates={cands} stops={chosenStops} searchBox={box} className="absolute inset-0" />
      </aside>
    </div>
  );
}
