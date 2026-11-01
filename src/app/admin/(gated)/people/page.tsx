import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/gate";
import { Card, Table, td, when, ago } from "@/components/admin/ui";
import { people } from "@/lib/admin/queries";

export const metadata = { title: "People" };

const stripe = (id: string | null) => (id ? `https://dashboard.stripe.com/${(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test") ? "test/" : ""}customers/${id}` : null);

/** Who signed up, what they are on, how much they have walked. */
async function PeoplePageContent() {
  await requireAdmin();
  const rows = await people();
  const paying = rows.filter((r) => r.plan !== "none" && r.planStatus === "active").length;
  return (
    <Card title={`People · ${rows.length} signed up · ${paying} on a pass`}>
      <Table head={["Email", "Plan", "Status", "Period ends", "Walks", "Joined", "Last seen", "Stripe"]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>{r.email}</td>
            <td className={td}>{r.plan === "none" ? "trial" : r.plan}</td>
            <td className={td}>{r.planStatus === "none" ? "" : r.planStatus}</td>
            <td className={td}>{r.planEndsAt ? when(r.planEndsAt) : ""}</td>
            <td className={td}>{r.walks}</td>
            <td className={td}>{when(r.createdAt)}</td>
            <td className={td}>{ago(r.lastSeenAt)}</td>
            <td className={td}>{stripe(r.stripeCustomerId) ? <a className="underline" href={stripe(r.stripeCustomerId)!} target="_blank" rel="noopener">customer</a> : ""}</td>
          </tr>
        ))}
        {!rows.length ? <tr><td className={td} colSpan={8}>Nobody yet.</td></tr> : null}
      </Table>
    </Card>
  );
}

/** The data is per request, so it streams inside its own boundary. */
export default function PeoplePage() {
  return <Suspense fallback={null}><PeoplePageContent /></Suspense>;
}
