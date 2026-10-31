import { Suspense } from "react";
import Planner from "@/components/request/Planner";

export default function Home({ searchParams }: { searchParams: Promise<{ start?: string; minutes?: string }> }) {
  return <Suspense fallback={null}><HomeContent searchParams={searchParams} /></Suspense>;
}

async function HomeContent({ searchParams }: { searchParams: Promise<{ start?: string; minutes?: string }> }) {
  const { start, minutes } = await searchParams;
  const m = Number(minutes);
  return <Planner initial={{ ...(start ? { start: start.slice(0, 120) } : {}), ...(m >= 15 && m <= 480 ? { minutes: m } : {}) }} />;
}
