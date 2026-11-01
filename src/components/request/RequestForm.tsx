"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { track, whenString } from "@/lib/client/events";

export type FormState = {
  start: string;
  endKind: "same" | "place" | "transport" | "anywhere";
  endPlace: string;
  minutes: number;
  companions: string[];
  pace: "auto" | "relaxed" | "normal" | "brisk";
  interests: string[];
  date: string;
  time: string;
  notes: string;
};

export const INTEREST_TILES: { key: string; label: string; icon: IconName; interests: string[] }[] = [
  { key: "nature", label: "Nature", icon: "nature", interests: ["nature"] },
  { key: "cafes", label: "Cafés", icon: "cafes", interests: ["cafes"] },
  { key: "history", label: "History", icon: "history", interests: ["history"] },
  { key: "modern", label: "Modern architecture", icon: "modern", interests: ["modern"] },
  { key: "craft", label: "Art & craft", icon: "craft", interests: ["art", "craft"] },
  { key: "views", label: "Views", icon: "views", interests: ["views"] },
  { key: "photo", label: "Photo spots", icon: "photo", interests: ["photo"] },
  { key: "film", label: "Film locations", icon: "film", interests: ["film"] },
  { key: "museums", label: "Museums", icon: "museums", interests: ["museums"] },
  { key: "shops", label: "Shops", icon: "shops", interests: ["shops"] },
  { key: "gaming", label: "Gaming", icon: "gaming", interests: ["gaming"] },
  { key: "technology", label: "Technology", icon: "technology", interests: ["technology"] },
];
const COMPANIONS: { key: string; label: string; icon: IconName }[] = [
  { key: "me", label: "Just me", icon: "me" }, { key: "kids", label: "With kids", icon: "kids" }, { key: "older", label: "Older people", icon: "older" },
  { key: "limited_mobility", label: "Limited mobility", icon: "limited_mobility" }, { key: "pram", label: "Pram", icon: "pram" },
];
const DURATIONS = [30, 45, 60, 90, 120, 180, 240];
const STEPS = ["Where", "How long", "Who", "What you love", "When", "Anything else"] as const;

export const initialForm: FormState = { start: "", endKind: "anywhere", endPlace: "", minutes: 90, companions: ["me"], pace: "auto", interests: ["history"], date: "", time: "", notes: "" };

/** The request the planner expects, from the form. */
export function toRequest(f: FormState) {
  const interests = [...new Set(f.interests.flatMap((k) => INTEREST_TILES.find((t) => t.key === k)?.interests ?? []))];
  return {
    start: f.start.trim(),
    end: f.endKind === "place" ? { kind: "place", place: f.endPlace.trim() } : { kind: f.endKind },
    minutes: f.minutes,
    companions: f.companions.length ? f.companions : ["me"],
    ...(f.pace !== "auto" ? { pace: f.pace } : {}),
    interests,
    when: whenString(f.date, f.time),
    notes: f.notes.trim(),
    language: typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "en",
  };
}

export function summarySentence(f: FormState): string {
  const hours = f.minutes >= 60 ? `${f.minutes / 60}`.replace(".5", "½") + (f.minutes >= 120 ? " hours" : " hour") : `${f.minutes} minutes`;
  const who = f.companions.filter((c) => c !== "me").map((c) => COMPANIONS.find((x) => x.key === c)?.label.toLowerCase()).filter(Boolean);
  const loves = f.interests.map((k) => INTEREST_TILES.find((t) => t.key === k)?.label.toLowerCase()).filter(Boolean);
  const end = f.endKind === "place" && f.endPlace ? `to ${f.endPlace}` : f.endKind === "transport" ? "ending near a station" : f.endKind === "same" ? "back to the start" : "ending anywhere";
  const when = f.date ? `on ${new Date(f.date + "T12:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}${f.time ? ` at ${f.time}` : ""}` : "today";
  return `A ${hours} walk from ${f.start || "…"}, ${end}, ${when}${who.length ? `, ${who.join(" and ")}` : ""}${loves.length ? `, around ${loves.join(", ")}` : ""}.`;
}

const chip = (on: boolean) => `flex min-h-12 items-center gap-2 rounded-full border-2 px-4 text-[15px] font-medium transition-colors ${on ? "border-ink bg-ink text-white" : "border-line bg-paper text-text hover:border-muted"}`;
const tile = (on: boolean) => `flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 text-[13px] font-medium transition-colors ${on ? "border-ink bg-ink-soft text-text" : "border-line bg-paper text-text hover:border-muted"}`;
const input = "min-h-12 w-full rounded-xl border-[1.5px] border-line bg-paper px-3 text-[16px] text-text placeholder:text-muted";
const h2 = "font-serif text-3xl font-medium tracking-tight md:font-sans md:text-[15px] md:font-semibold md:tracking-normal";

export default function RequestForm({ onSubmit, busy, initial, startFrom }: { onSubmit: (req: ReturnType<typeof toRequest>) => void; busy: boolean; initial?: Partial<FormState>; startFrom?: string }) {
  const [f, setF] = useState<FormState>({ ...initialForm, ...initial });
  // A city pin on the map sets the start: adopted during render, the React way for state that follows a prop.
  const [adopted, setAdopted] = useState<string | undefined>(undefined);
  if (startFrom && startFrom !== adopted) { setAdopted(startFrom); setF((s) => ({ ...s, start: startFrom })); }
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState(false);
  const [locating, setLocating] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);
  const [locateNote, setLocateNote] = useState<string | null>(null);
  const [dir, setDir] = useState<"in" | "back">("in");
  const stepAnim = phone ? (dir === "back" ? "fn-step-back" : "fn-step-in") : "";
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => { setNudge(null); setF((s) => ({ ...s, [k]: v })); };
  const toggle = (k: "companions" | "interests", v: string) => { setNudge(null); setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] })); };
  const summary = useMemo(() => summarySentence(f), [f]);
  const canSubmit = f.start.trim().length > 1 && f.interests.length > 0 && !busy;
  const show = (i: number) => !phone || step === i;

  const locate = () => {
    if (!navigator.geolocation || !window.isSecureContext) { setLocateNote("Your browser only shares location on a secure (https) address or localhost. Type a place instead."); return; }
    setLocateNote(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { set("start", `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`); setLocating(false); track("request.locate"); },
      () => { setLocating(false); setLocateNote("Location was refused or timed out. Allow it in the browser, or type a place."); }, { timeout: 8000 },
    );
  };
  const submit = () => { if (!canSubmit) return; track("request.submit", { minutes: f.minutes, interests: f.interests.length, companions: f.companions.join(","), notes: f.notes.trim().length > 0 }); onSubmit(toRequest(f)); };

  return (
    <form className="flex flex-col gap-7" onSubmit={(e) => {
      e.preventDefault();
      if (phone && step === 0 && f.start.trim().length < 2) { setNudge("Add a start to continue."); document.getElementById("start")?.focus(); return; }
      if (phone && step === 3 && !f.interests.length) { setNudge("Pick at least one thing you love."); return; }
      if (!phone && !canSubmit) { const noStart = f.start.trim().length < 2; setNudge(noStart ? "Add a start to continue." : "Pick at least one thing you love."); (noStart ? document.getElementById("start") : document.querySelector<HTMLElement>("[aria-label=\"Interests\"] button"))?.focus(); return; }
      setNudge(null);
      if (phone && step < STEPS.length - 1) { setDir("in"); setStep(step + 1); } else submit();
    }} aria-busy={busy}>
      {phone ? (
        <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between bg-paper px-6 py-2 text-[13px] text-muted">
          <span>{step + 1} of {STEPS.length}</span>
          <div className="flex gap-1.5" aria-hidden="true">{STEPS.map((_, i) => <span key={i} className={`h-1 w-8 rounded-full ${i <= step ? "bg-ink" : "bg-line"}`} />)}</div>
        </div>
      ) : null}
      <p className="font-serif text-[26px] leading-tight tracking-tight md:text-[28px]">{summary}</p>

      {show(0) ? (
        <section className={`flex flex-col gap-4 ${stepAnim}`} aria-labelledby="q-where">
          <h2 id="q-where" className={h2}>Where?</h2>
          <div className="flex gap-2">
            <label className="flex-1"><span className="sr-only">Start</span><input id="start" name="start" enterKeyHint="next" className={input} placeholder="Start: a place, an address, or use your location…" value={f.start} onChange={(e) => set("start", e.target.value)} autoComplete="off" required /></label>
            <button type="button" onClick={locate} className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border-[1.5px] border-line text-ink" aria-label="Use my location" disabled={locating}><Icon.locate /></button>
          </div>
          {locateNote ? <p role="alert" className="rounded-xl bg-soft px-4 py-3 text-[14px] font-medium text-amber">{locateNote}</p> : null}
          <div className="flex flex-wrap gap-2" role="group" aria-label="End">
            {([["anywhere", "Anywhere, surprise me"], ["same", "Back to the start"], ["transport", "Near a station or stop"], ["place", "A place"]] as const).map(([k, l]) => (
              <button type="button" key={k} className={chip(f.endKind === k)} aria-pressed={f.endKind === k} onClick={() => set("endKind", k)}>{l}</button>
            ))}
          </div>
          {f.endKind === "place" ? <input name="end" className={input} placeholder="End: the place to finish at, the thoughtful way…" value={f.endPlace} onChange={(e) => set("endPlace", e.target.value)} aria-label="End place" /> : null}
        </section>
      ) : null}

      {show(1) ? (
        <section className={`flex flex-col gap-4 ${stepAnim}`} aria-labelledby="q-long">
          <h2 id="q-long" className={h2}>How long?</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Duration">
            {DURATIONS.map((m) => <button type="button" key={m} className={chip(f.minutes === m)} aria-pressed={f.minutes === m} onClick={() => set("minutes", m)}>{m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}½ h` : `${m / 60} h`}</button>)}
          </div>
          <p className="text-[14px] text-muted">About {(f.minutes * 0.06).toFixed(1).replace(".0", "")} km at a normal pace, less with stops.</p>
        </section>
      ) : null}

      {show(2) ? (
        <section className={`flex flex-col gap-4 ${stepAnim}`} aria-labelledby="q-who">
          <h2 id="q-who" className={h2}>Who is walking?</h2>
          <p className="text-[15px] text-muted md:hidden">Sets the pace, the breaks and whether we avoid steps.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Companions">
            {COMPANIONS.map((c) => { const I = Icon[c.icon]; const on = f.companions.includes(c.key); return <button type="button" key={c.key} className={chip(on)} aria-pressed={on} onClick={() => toggle("companions", c.key)}><I width={18} height={18} />{c.label}</button>; })}
          </div>
          <label className="flex items-center gap-3 text-[14px] text-muted">Pace
            <select className="min-h-10 rounded-lg border-[1.5px] border-line bg-paper px-2 text-[16px] text-text" value={f.pace} onChange={(e) => set("pace", e.target.value as FormState["pace"])}>
              <option value="auto">Set by who is walking</option><option value="relaxed">Relaxed</option><option value="normal">Normal</option><option value="brisk">Brisk</option>
            </select>
          </label>
        </section>
      ) : null}

      {show(3) ? (
        <section className={`flex flex-col gap-4 ${stepAnim}`} aria-labelledby="q-love">
          <h2 id="q-love" className={h2}>What you love</h2>
          <p className="text-[14px] text-muted">Tap everything that applies; the first you tap counts most.</p>
          <div className="grid grid-cols-3 gap-2.5 md:grid-cols-6" role="group" aria-label="Interests">
            {INTEREST_TILES.map((t) => { const I = Icon[t.icon]; const on = f.interests.includes(t.key); return <button type="button" key={t.key} className={tile(on)} aria-pressed={on} onClick={() => toggle("interests", t.key)}><I style={{ color: on ? "var(--ink)" : "var(--muted)" }} />{t.label}</button>; })}
          </div>
        </section>
      ) : null}

      {show(4) ? (
        <section className={`flex flex-col gap-4 ${stepAnim}`} aria-labelledby="q-when">
          <h2 id="q-when" className={h2}>When?</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(!f.date)} aria-pressed={!f.date} onClick={() => { set("date", ""); set("time", ""); }}>Now</button>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-muted">Day<input type="date" name="date" className={`${input} w-auto`} value={f.date} onChange={(e) => set("date", e.target.value)} /></label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-muted">Time<input type="time" name="time" className={`${input} w-auto`} value={f.time} onChange={(e) => set("time", e.target.value)} disabled={!f.date} /></label>
          </div>
          <p className="text-[14px] text-muted">So opening hours and the weather match the day.</p>
        </section>
      ) : null}

      {show(5) ? (
        <section className={`flex flex-col gap-4 ${stepAnim}`} aria-labelledby="q-else">
          <h2 id="q-else" className={h2}>Anything else?</h2>
          <input name="notes" autoComplete="off" enterKeyHint="go" className={input} placeholder="For example: avoid busy roads, end near a pub, we have seen the abbey…" value={f.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} aria-label="Anything else" />
        </section>
      ) : null}

      {nudge ? <p role="alert" className="rounded-xl bg-soft px-4 py-3 text-[14px] font-medium text-amber">{nudge}</p> : null}
      <div className="mt-auto flex gap-3">
        {phone && step > 0 ? <button type="button" className="min-h-[52px] flex-1 rounded-2xl border-2 border-line font-semibold hover:bg-soft" onClick={() => { setNudge(null); setDir("back"); setStep(step - 1); }}>Back</button> : null}
        <button type="submit" className="min-h-[52px] flex-[2] rounded-2xl bg-text font-semibold text-paper disabled:opacity-40" disabled={busy}>
          {phone && step < STEPS.length - 1 ? `Next: ${STEPS[step + 1].toLowerCase()}` : busy ? "Building…" : "Build my walk"}
        </button>
      </div>
    </form>
  );
}
