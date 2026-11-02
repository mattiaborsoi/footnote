import { CITY_ID_PATTERN } from "@/lib/ids";
import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cities } from "@/lib/db/schema";
import { listPresets } from "@/lib/scout/presets";

export const metadata: Metadata = { title: "City" };

/** A city's ready-made walks: served from the cache, re-checked for your day on the walk page, tailored on request. */
export default function CityPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={null}><CityContent params={params} /></Suspense>;
}

async function CityContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  if (!db || !CITY_ID_PATTERN.test(id)) notFound();
  const city = await db.query.cities.findFirst({ where: eq(cities.id, id) });
  if (!city) notFound();
  const presets = await listPresets(id);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Logo size={24} />
        <h1 className="font-serif text-[36px] leading-tight tracking-tight">Ready-made walks in {city.name}</h1>
        <p className="text-muted">Built from the city&apos;s map and from what travel writers recommend. Open one, re-check it for your day, or tailor it to you.</p>
      </header>
      {presets.length ? (
        <ol className="flex flex-col gap-4">
          {presets.map((p) => (
            <li key={p.id}>
              <Link href={`/w/${p.id}`} className="flex flex-col gap-1 rounded-2xl border-2 border-line p-5 hover:border-muted">
                <span className="text-[13px] text-muted">{p.label}: {p.totalMinutes} min, {(p.distanceM / 1000).toFixed(1)} km, {p.stops} stops</span>
                <span className="font-serif text-[24px] leading-tight">{p.title}</span>
                <span className="text-[14px] text-muted">{p.summary}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : <p className="rounded-xl bg-soft p-4 text-muted">This city is on the list; its walks are being prepared.</p>}
      <Link href={`/?start=${encodeURIComponent(city.name)}`} className="self-start rounded-xl bg-text px-5 py-3 font-semibold text-paper">Build your own</Link>
    </main>
  );
}
