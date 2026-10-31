import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ID_PATTERN } from "@/lib/ids";
import { loadWalk } from "@/lib/walks";
import PrintButton from "@/components/PrintButton";

const SUP = ["¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "¹⁰", "¹¹", "¹²"];

export const metadata: Metadata = { title: "Footnoted walk" };

/** The signature page: the route as a thin line, the stops numbered, the notes in small type below. Prints on one sheet. */
export default function FootnotedPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><Content params={params} /></Suspense>;
}

function project(points: { lat: number; lon: number }[], w: number, h: number, pad: number) {
  const lats = points.map((p) => p.lat), lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const k = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = Math.max((maxLon - minLon) * k, 1e-6), spanY = Math.max(maxLat - minLat, 1e-6);
  const scale = Math.min((w - 2 * pad) / spanX, (h - 2 * pad) / spanY);
  const ox = (w - spanX * scale) / 2, oy = (h - spanY * scale) / 2;
  return (p: { lat: number; lon: number }) => ({ x: ox + (p.lon - minLon) * k * scale, y: h - (oy + (p.lat - minLat) * scale) });
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) notFound();
  const walk = await loadWalk(id);
  if (!walk) notFound();
  const W = 600, H = 380;
  const pts = [walk.start, ...walk.route, ...walk.stops, ...(walk.end ? [walk.end] : [])];
  const P = project(pts, W, H, 36);
  const line = walk.route.map((p) => { const q = P(p); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ");
  const s = P(walk.start), e = P(walk.end ?? walk.start);
  return (
    <main className="mx-auto flex max-w-[680px] flex-col gap-5 bg-white px-10 py-12 text-[#141413] print:px-0 print:py-0" style={{ colorScheme: "light" }}>
      <div className="flex justify-between text-[11px] uppercase tracking-[0.2em] text-[#5f5e5a]"><span>Footnote</span><span>{walk.startsAt?.replace("T", " ") ?? walk.createdAt.slice(0, 10)}</span></div>
      <h1 className="font-serif text-[32px] leading-[1.15] tracking-tight">{walk.title}</h1>
      <p className="text-[13px] text-[#5f5e5a]">{walk.totalMinutes} min · {(walk.distanceM / 1000).toFixed(1)} km · {walk.steps.toLocaleString()} steps</p>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="The route as a thin line with numbered stops" className="w-full">
        <polyline points={line} fill="none" stroke="#1e3a8a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <rect x={s.x - 6} y={s.y - 6} width="12" height="12" fill="#1e3a8a" />
        {walk.end ? <path d={`M${e.x} ${e.y - 8} L${e.x + 8} ${e.y} L${e.x} ${e.y + 8} L${e.x - 8} ${e.y} Z`} fill="#1e3a8a" /> : null}
        {walk.stops.map((st, i) => { const q = P(st); return (
          <g key={st.id}>
            <circle cx={q.x} cy={q.y} r="11" fill="#fff" stroke="#1e3a8a" strokeWidth="2" />
            <text x={q.x} y={q.y + 4.5} textAnchor="middle" fontSize="12" fontWeight="600" fontFamily="var(--font-fraunces), Georgia, serif" fill="#141413">{i + 1}</text>
            <text x={q.x + 15} y={q.y + 4} fontSize="11" fill="#5f5e5a" fontFamily="var(--font-inter), system-ui, sans-serif">{st.name}</text>
          </g>
        ); })}
      </svg>
      <hr className="border-0 border-t border-[#141413]" />
      <ol className="flex flex-col gap-2 font-serif text-[13.5px] leading-[1.45]">
        {walk.stops.map((st, i) => (
          <li key={st.id}><span className="italic text-[#1e3a8a]">{SUP[i] ?? String(i + 1)}</span> <strong>{st.name}.</strong> {st.hook}{st.arrival ? ` Arrive ${st.arrival}.` : ""}{st.sources?.length ? ` Recommended on ${st.sources.map((x) => x.title).join(", ")}.` : ""}</li>
        ))}
      </ol>
      <div className="mt-auto flex justify-between text-[11px] text-[#5f5e5a]"><span>Map data © OpenStreetMap contributors · stories from Wikipedia and linked sources</span><span className="font-serif italic">footnote /w/{walk.id}</span></div>
      <PrintButton />
    </main>
  );
}
