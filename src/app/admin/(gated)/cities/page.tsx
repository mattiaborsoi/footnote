import Link from "next/link";
import CityActions from "@/components/admin/CityActions";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/gate";
import { Card, Table, td, ago } from "@/components/admin/ui";
import { cityList } from "@/lib/admin/queries";

export const metadata = { title: "Cities" };

/** The scout layer: which cities are cached and scouted, how fresh, how many spots. */
async function CitiesPageContent() {
  await requireAdmin();
  const rows = await cityList();
  return (
    <Card title={`Cities · ${rows.length}`} aside={<CityActions />}>
      <Table head={["City", "Status", "Places", "Places cached", "Spots", "Sources", "Scouted", ""]}>
        {rows.map((c) => (
          <tr key={c.id}>
            <td className={td}><Link className="underline" href={`/city/${c.id}`} target="_blank">{c.name}</Link></td>
            <td className={td}>{c.status}</td>
            <td className={td}>{c.places}</td>
            <td className={td}>{ago(c.placesAt)}</td>
            <td className={td}>{c.spots}</td>
            <td className={td}>{c.sources}</td>
            <td className={td}>{ago(c.scoutedAt)}</td>
            <td className={td}><CityActions city={c.name} /></td>
          </tr>
        ))}
        {!rows.length ? <tr><td className={td} colSpan={8}>No cities yet.</td></tr> : null}
      </Table>
    </Card>
  );
}

/** The data is per request, so it streams inside its own boundary. */
export default function CitiesPage() {
  return <Suspense fallback={null}><CitiesPageContent /></Suspense>;
}
