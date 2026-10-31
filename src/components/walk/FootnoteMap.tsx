"use client";
import dynamic from "next/dynamic";

const WalkMap = dynamic(() => import("@/components/map/WalkMap"), { ssr: false });

/** The footnoted page's map: the real base map with a thin route and small numbered discs, still and printable. */
export default function FootnoteMap({ start, end, route, stops }: { start: { lat: number; lon: number }; end: { lat: number; lon: number } | null; route: { lat: number; lon: number }[]; stops: { id: string; name: string; category: string; lat: number; lon: number }[] }) {
  return (
    <div className="relative h-[380px] w-full overflow-hidden rounded border border-[#e6e4de] bg-[#edebe4]">
      <WalkMap variant="print" start={start} end={end} route={route} stops={stops} className="absolute inset-0" />
    </div>
  );
}
