import Link from "next/link";
import MarkDone from "@/components/admin/MarkDone";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/gate";
import { Card, when } from "@/components/admin/ui";
import { feedbackList } from "@/lib/admin/queries";

export const metadata = { title: "Feedback" };

/** Every report with its context; open ones first. */
async function FeedbackPageContent() {
  await requireAdmin();
  const rows = await feedbackList();
  return (
    <Card title={`Feedback · ${rows.filter((r) => !r.done).length} open`}>
      <ul className="flex flex-col divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className={`flex flex-col gap-2 py-4 ${r.done ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span>{when(r.ts)}</span>
              {r.screen ? <span>screen: {r.screen}</span> : null}
              {r.walkId ? <Link className="underline" href={`/w/${r.walkId}`} target="_blank">walk {r.walkId}</Link> : null}
              {r.contact ? <span>reply to: {r.contact}</span> : null}
              <span className="ml-auto"><MarkDone kind="feedback.done" id={String(r.id)} done={r.done} /></span>
            </div>
            <p className="whitespace-pre-wrap text-[15px]">{r.message}</p>
            {Object.keys(r.context as object).length ? <details className="text-[12px] text-muted"><summary className="cursor-pointer">context</summary><pre className="mt-1 overflow-x-auto rounded-lg bg-soft p-2">{JSON.stringify(r.context, null, 1)}</pre></details> : null}
          </li>
        ))}
        {!rows.length ? <li className="py-4 text-[15px] text-muted">No feedback yet.</li> : null}
      </ul>
    </Card>
  );
}

/** The data is per request, so it streams inside its own boundary. */
export default function FeedbackPage() {
  return <Suspense fallback={null}><FeedbackPageContent /></Suspense>;
}
