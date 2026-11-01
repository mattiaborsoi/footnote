import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/gate";
import { Card, Table, td, when } from "@/components/admin/ui";
import { recentWalks } from "@/lib/admin/queries";

export const metadata = { title: "Walks" };

/** What people asked for and what they got, newest first. */
async function WalksPageContent() {
  await requireAdmin();
  const rows = await recentWalks();
  return (
    <Card title={`Walks · last ${rows.length}`}>
      <Table head={["When", "Walk", "From", "Interests", "Min", "Stops", "City", "Owner", "Lang"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>{when(r.createdAt)}</td>
            <td className={td}><Link className="underline" href={`/w/${r.id}`} target="_blank">{r.title}</Link>{r.preset ? <span className="ml-2 rounded-full bg-soft px-2 text-[11px] uppercase">preset</span> : null}</td>
            <td className={td}>{r.start}</td>
            <td className={td}>{r.interests}</td>
            <td className={td}>{r.minutes}</td>
            <td className={td}>{r.stops}</td>
            <td className={td}>{r.cityId ?? ""}</td>
            <td className={td}>{r.owner ?? ""}</td>
            <td className={td}>{r.language}</td>
          </tr>
        ))}
        {!rows.length ? <tr><td className={td} colSpan={9}>No walks yet.</td></tr> : null}
      </Table>
    </Card>
  );
}

/** The data is per request, so it streams inside its own boundary. */
export default function WalksPage() {
  return <Suspense fallback={null}><WalksPageContent /></Suspense>;
}
