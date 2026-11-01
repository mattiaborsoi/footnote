import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import WalkView from "@/components/walk/WalkView";
import { currentUser } from "@/lib/auth/session";
import { ID_PATTERN } from "@/lib/ids";
import { loadWalk } from "@/lib/walks";

export const metadata: Metadata = { title: "Your walk", robots: { index: false, follow: false } };

/** A walk as a page: the shareable, bookmarkable record. Loaded at request time, inside a Suspense boundary so the route can stream. */
export default function WalkPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-10 font-serif text-2xl text-muted">Loading your walk…</div>}>
      <WalkContent params={params} />
    </Suspense>
  );
}

async function WalkContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) notFound();
  const [walk, user] = await Promise.all([loadWalk(id), currentUser()]);
  if (!walk) notFound();
  const { ownerId, ...rest } = walk;
  return <WalkView initial={rest} owned={!!user && ownerId === user.id} />;
}
