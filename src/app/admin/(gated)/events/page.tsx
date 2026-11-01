import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/gate";
import { Card, Table, td, when } from "@/components/admin/ui";
import { eventCounts, recentEvents } from "@/lib/admin/queries";

export const metadata = { title: "Events" };

/** The raw product log: every event type with its count over a week, and the latest rows, filtered by type. */
async function EventsPageContent({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireAdmin();
  const { type } = await searchParams;
  const chosen = type && /^[a-z._]{3,60}$/.test(type) ? type : null;
  const [counts, rows] = await Promise.all([eventCounts(7), recentEvents(chosen)]);
  const types = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <Card title="Event types, last 7 days">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/events" className={`rounded-full px-3 py-1 text-[13px] font-semibold ${!chosen ? "bg-text text-paper" : "border-2 border-line"}`}>all</Link>
          {types.map(([t, n]) => <Link key={t} href={`/admin/events?type=${t}`} className={`rounded-full px-3 py-1 text-[13px] font-semibold ${chosen === t ? "bg-text text-paper" : "border-2 border-line"}`}>{t} <span className="text-muted">{n}</span></Link>)}
        </div>
      </Card>
      <Card title={chosen ? `Latest ${chosen}` : "Latest events"}>
        <Table head={["When", "Type", "Walk", "Session", "Fields"]}>
          {rows.map((e) => (
            <tr key={e.id}>
              <td className={td}>{when(e.ts)}</td>
              <td className={td}>{e.type}</td>
              <td className={td}>{e.walkId ? <Link className="underline" href={`/w/${e.walkId}`} target="_blank">{e.walkId}</Link> : ""}</td>
              <td className={`${td} text-muted`}>{e.sessionId?.slice(0, 8) ?? ""}</td>
              <td className={`${td} font-mono text-[12px]`}>{JSON.stringify(e.fields)}</td>
            </tr>
          ))}
          {!rows.length ? <tr><td className={td} colSpan={5}>Nothing here.</td></tr> : null}
        </Table>
      </Card>
    </>
  );
}

/** The data is per request, so it streams inside its own boundary. */
export default function EventsPage(props: { searchParams: Promise<{ type?: string }> }) {
  return <Suspense fallback={null}><EventsPageContent {...props} /></Suspense>;
}
