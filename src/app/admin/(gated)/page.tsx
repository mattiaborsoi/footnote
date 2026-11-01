import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/gate";
import { Card, Stat, Table, td } from "@/components/admin/ui";
import { currency, estimateCost } from "@/lib/admin/cost";
import { daily, eventCounts, feedbackList, ratings, tokenTotals, waitTimes } from "@/lib/admin/queries";

/** What is going on: the last day, week and month side by side, then day by day. */
async function OverviewContent() {
  await requireAdmin();
  const windows = [1, 7, 30];
  const [counts, tokens, waits, days, fb, rated] = await Promise.all([
    Promise.all(windows.map(eventCounts)), Promise.all(windows.map(tokenTotals)), Promise.all(windows.map(waitTimes)), daily(14), feedbackList(50), Promise.all(windows.map(ratings)),
  ]);
  const open = fb.filter((f) => !f.done).length;
  const n = (c: Record<string, number>, k: string) => c[k] ?? 0;
  const money = (v: number) => `${currency()}${v.toFixed(2)}`;
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {windows.map((w, i) => {
          const c = counts[i], t = tokens[i], wt = waits[i], r = rated[i];
          const topReason = Object.entries(r.reasons).sort((a, b) => b[1] - a[1])[0];
          const cost = estimateCost(t.prompt, t.completion);
          return (
            <Card key={w} title={w === 1 ? "Last 24 hours" : `Last ${w} days`}>
              <div className="flex flex-wrap gap-2">
                <Stat label="Walks built" value={n(c, "walk.built")} note={`${n(c, "walk.cache_hit")} from cache`} />
                <Stat label="Errors" value={n(c, "walk.error")} note={`${n(c, "walk.limited")} limited`} />
                <Stat label="Sign-ups" value={n(c, "auth.signed_up")} note={`${n(c, "auth.signed_in")} sign-ins`} />
                <Stat label="Passes" value={n(c, "billing.activated")} note={`${n(c, "billing.checkout")} checkouts`} />
                <Stat label="Rated" value={r.up + r.down ? `${r.up} up` : "–"} note={r.up + r.down ? `${r.down} down${topReason ? ` · mostly "${topReason[0]}"` : ""}` : "no ratings"} />
                <Stat label="Wait" value={wt.n ? `${Math.round(wt.p50 / 1000)} s` : "–"} note={wt.n ? `p95 ${Math.round(wt.p95 / 1000)} s` : "no walks"} />
                <Stat label="Model cost" value={money(cost)} note={t.walks ? `${money(cost / t.walks)} a walk · ${Math.round((t.prompt + t.completion) / 1000)}k tokens` : "no walks"} />
              </div>
            </Card>
          );
        })}
      </div>
      <Card title="Day by day" aside={<span className="text-[13px] text-muted">{open} feedback open</span>}>
        <Table head={["Day", "Built", "Cached", "Errors", "Limited", "Sign-ups", ""]}>
          {days.map((d) => {
            const max = Math.max(1, ...days.map((x) => x.built + x.cached));
            return (
              <tr key={d.day}>
                <td className={td}>{d.day}</td><td className={td}>{d.built}</td><td className={td}>{d.cached}</td><td className={td}>{d.errors}</td><td className={td}>{d.limited}</td><td className={td}>{d.signups}</td>
                <td className={`${td} w-full`}><div className="flex h-3 overflow-hidden rounded bg-soft"><div className="bg-ink" style={{ width: `${(d.built / max) * 100}%` }} /><div className="bg-amber" style={{ width: `${(d.cached / max) * 100}%` }} /></div></td>
              </tr>
            );
          })}
          {!days.length ? <tr><td className={td} colSpan={7}>No events yet.</td></tr> : null}
        </Table>
        <p className="text-[12px] text-muted">Ink: built by the model. Amber: served from the cache. Model cost uses LLM_PRICE_IN_PER_M and LLM_PRICE_OUT_PER_M; the test environment runs on a subscription, so set the prices to what production pays.</p>
      </Card>
    </>
  );
}

/** The data is per request, so it streams inside its own boundary. */
export default function Overview() {
  return <Suspense fallback={null}><OverviewContent /></Suspense>;
}
