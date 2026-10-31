import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ID_PATTERN } from "@/lib/ids";
import { loadWalk } from "@/lib/walks";

/** A walk as a page: the shareable, bookmarkable record. The map and the full design come with the UI milestone. */
export default function WalkPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="p-10 text-neutral-500">Loading your walk…</main>}>
      <WalkContent params={params} />
    </Suspense>
  );
}

async function WalkContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) notFound();
  const walk = await loadWalk(id);
  if (!walk) notFound();
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Footnote · {walk.startsAt?.replace("T", " ") ?? ""}</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight">{walk.title}</h1>
        <p className="text-lg text-neutral-700 dark:text-neutral-300">{walk.summary}</p>
        <p className="text-sm text-neutral-500">
          {walk.totalMinutes} min · {(walk.distanceM / 1000).toFixed(1)} km · {walk.steps.toLocaleString()} steps
          {walk.weather ? ` · ${walk.weather.summary}` : ""}
        </p>
      </header>
      <ol className="flex flex-col gap-6">
        {walk.stops.map((s, i) => (
          <li key={s.id} className="flex gap-4">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 border-blue-900 text-sm font-semibold text-blue-900 dark:border-blue-300 dark:text-blue-300">{i + 1}</span>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-neutral-500">
                {s.arrival ? `arrive ${s.arrival}` : ""}
                {s.hoursNote ? ` · ${s.hoursNote}` : ""}
              </p>
              <h2 className="font-serif text-2xl">{s.name}</h2>
              <p className="text-base">{s.hook}</p>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{s.story}</p>
              <p className="text-sm"><strong className="text-blue-900 dark:text-blue-300">Why it&apos;s here for you</strong> — {s.why}</p>
              {s.sources?.length ? (
                <p className="text-xs text-neutral-500">
                  Recommended on {s.sources.map((src, j) => (
                    <span key={src.url}>{j > 0 ? ", " : ""}<a className="underline" href={src.url} rel="nofollow noopener">{src.title}</a></span>
                  ))}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p>
        <a className="inline-flex min-h-12 items-center rounded-xl bg-neutral-900 px-5 font-semibold text-white dark:bg-white dark:text-neutral-900" href={walk.googleMapsUrl}>Open in Google Maps</a>
      </p>
      <footer className="text-xs text-neutral-500">Map data © OpenStreetMap contributors · stories from the linked sources</footer>
    </main>
  );
}
