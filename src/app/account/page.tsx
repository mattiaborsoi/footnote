import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import AccountActions from "@/components/account/AccountActions";
import { allowanceFor } from "@/lib/account/allowance";
import { currentUser } from "@/lib/auth/session";
import { walksOf } from "@/lib/walks";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-8 px-6 py-8">
      <Logo />
      <Suspense fallback={null}><Body searchParams={searchParams} /></Suspense>
    </main>
  );
}

const planName = (p: string) => (p === "week" ? "Week pass" : p === "month" ? "Monthly plan" : "Free trial");
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

async function Body({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin?next=/account");
  const [{ checkout }, allowance, mine] = await Promise.all([searchParams, allowanceFor(user, null), walksOf(user.id)]);
  const left = Math.max(0, allowance.limit - allowance.used);
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-[12px] uppercase tracking-[0.2em] text-muted">Your account</p>
        <h1 className="font-serif text-[30px] leading-tight tracking-tight">{user.email}</h1>
      </header>
      {checkout === "done" ? <p role="status" className="rounded-2xl bg-soft px-5 py-4 text-[15px]">Thank you. Your pass is being switched on; if it is not showing yet, give it a few seconds and reload.</p> : null}
      <section className="flex flex-col gap-3 rounded-2xl border-2 border-line p-5">
        <h2 className="font-serif text-[22px]">{planName(allowance.plan)}</h2>
        <p className="text-[15px] text-muted">
          {allowance.plan === "none" ? `${left} of ${allowance.limit} free ${allowance.limit === 1 ? "walk" : "walks"} left.` : `${left} of ${allowance.limit} walks left${allowance.endsAt ? ` until ${day(allowance.endsAt)}` : ""}.`}
          {user.planStatus === "cancelled" && allowance.endsAt ? " Cancelled; access runs to the end of the period." : ""}
          {user.planStatus === "past_due" ? " The last payment failed; update the card to keep the plan." : ""}
        </p>
        {allowance.plan === "none" || left === 0 ? <Link href="/plans" className="flex min-h-12 w-fit items-center rounded-xl bg-text px-4 font-semibold text-paper">See the passes</Link> : null}
        <AccountActions hasBilling={!!user.stripeCustomerId} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-[22px]">Your walks</h2>
        {mine.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {mine.map((w) => <li key={w.id}><Link href={`/w/${w.id}`} className="flex min-h-12 items-center justify-between gap-4 py-2"><span className="font-medium">{w.title}</span><span className="flex-none text-[13px] text-muted">{w.totalMinutes} min · {day(w.createdAt)}</span></Link></li>)}
          </ul>
        ) : <p className="text-[15px] text-muted">None kept yet. <Link className="underline" href="/">Plan one</Link>, or open a walk you built and keep it.</p>}
      </section>
      <p className="text-[13px] text-muted"><Link className="underline" href="/privacy">Privacy</Link> · <Link className="underline" href="/terms">Terms</Link></p>
    </div>
  );
}
