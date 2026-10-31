import { Suspense } from "react";
import { notFound } from "next/navigation";
import Planner from "@/components/request/Planner";
import { ID_PATTERN } from "@/lib/ids";
import { loadRequest } from "@/lib/walks";

/** Tailor a stored walk: the form prefilled from its request; the rebuild uses the city's cache. */
export default function TailorPage({ searchParams }: { searchParams: Promise<{ of?: string }> }) {
  return <Suspense fallback={null}><TailorContent searchParams={searchParams} /></Suspense>;
}

async function TailorContent({ searchParams }: { searchParams: Promise<{ of?: string }> }) {
  const { of } = await searchParams;
  if (!of || !ID_PATTERN.test(of)) notFound();
  const req = (await loadRequest(of)) as { start?: string; minutes?: number; companions?: string[]; notes?: string; end?: { kind: string; place?: string } } | null;
  if (!req) notFound();
  const initial = { start: req.start ?? "", minutes: req.minutes ?? 90, companions: req.companions ?? ["me"], notes: req.notes ?? "", endKind: (req.end?.kind ?? "anywhere") as "same" | "place" | "transport" | "anywhere", endPlace: req.end?.place ?? "" };
  return <Planner initial={initial} tailorOf={of} />;
}
