import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ID_PATTERN } from "@/lib/ids";
import { loadWalk } from "@/lib/walks";
import PrintButton from "@/components/PrintButton";
import FootnoteMap from "@/components/walk/FootnoteMap";

const SUP = ["¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "¹⁰", "¹¹", "¹²"];

export const metadata: Metadata = { title: "Footnoted walk", robots: { index: false, follow: false } };

/** The signature page: the route as a thin line, the stops numbered, the notes in small type below. Prints on one sheet. */
export default function FootnotedPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><Content params={params} /></Suspense>;
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) notFound();
  const walk = await loadWalk(id);
  if (!walk) notFound();
  return (
    <main className="mx-auto flex max-w-[680px] flex-col gap-5 bg-white px-10 py-12 text-[#141413] print:px-0 print:py-0" style={{ colorScheme: "light" }}>
      <div className="flex justify-between text-[12px] text-[#5f5e5a]"><span>Footnote</span><span>{new Date((walk.startsAt ?? walk.createdAt.slice(0, 16)) + ":00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}{walk.startsAt ? `, ${walk.startsAt.slice(11, 16)}` : ""}</span></div>
      <h1 className="font-serif text-[32px] leading-[1.15] tracking-tight">{walk.title}</h1>
      <p className="text-[13px] text-[#5f5e5a]">{walk.totalMinutes} min, {(walk.distanceM / 1000).toFixed(1)} km, {walk.steps.toLocaleString()} steps</p>
      <FootnoteMap start={walk.start} end={walk.end} route={walk.route} stops={walk.stops.map((st) => ({ id: st.id, name: st.name, category: st.category, lat: st.lat, lon: st.lon }))} />
      <hr className="border-0 border-t border-[#141413]" />
      <ol className="flex flex-col gap-2 font-serif text-[13.5px] leading-[1.45]">
        {walk.stops.map((st, i) => (
          <li key={st.id} className="break-inside-avoid"><span className="italic text-[#1e3a8a]">{SUP[i] ?? String(i + 1)}</span> <strong>{st.name}.</strong> {st.hook}{st.arrival ? ` Arrive ${st.arrival}.` : ""}{st.sources?.length ? ` Recommended on ${st.sources.map((x) => x.title).join(", ")}.` : ""}</li>
        ))}
      </ol>
      <div className="mt-auto flex justify-between text-[11px] text-[#5f5e5a]"><span>Map data © OpenStreetMap contributors. Stories from Wikipedia and the linked sources.</span><span className="font-serif italic">№ {walk.id}</span></div>
      <PrintButton />
    </main>
  );
}
