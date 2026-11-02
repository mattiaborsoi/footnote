import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import PlanButton from "@/components/account/PlanButton";
import { trialWalks, walkCostLabel } from "@/lib/account/allowance";
import { paymentsReady, plans } from "@/lib/billing/stripe";

export const metadata: Metadata = { title: "Passes" };

/** The two passes, in plain words: what they cost, how many walks, when they end. */
export default function PlansPage() {
  const ready = paymentsReady();
  const trial = trialWalks();
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-6 py-8">
      <Logo />
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-[34px] leading-[1.1] tracking-tight">A pass for the walks ahead</h1>
        <p className="text-[16px] text-muted">The first {trial === 1 ? "walk is" : `${trial} walks are`} free: one to try at home, one for the trip. Every walk costs real computing, so each pass says what it holds rather than promise &ldquo;unlimited&rdquo;.</p>
      </header>
      <section className="flex flex-col gap-2 rounded-2xl bg-soft p-5 text-[15px]">
        <h2 className="font-serif text-[20px]">Why a walk costs money</h2>
        <p>Each walk is built fresh: a large model reads up to sixty real places and their facts and writes the stories, a router walks every leg, and the hours and weather are checked for your day. At our volume that is {walkCostLabel()} of computing and services per walk. The rest of a pass pays for the servers, the scouting that keeps each city&apos;s recommendations fresh, and the people who keep it right. No adverts, no selling of data: the passes are the whole business.</p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {plans().map((p) => (
          <section key={p.id} className="flex flex-col gap-3 rounded-2xl border-2 border-line p-5">
            <h2 className="font-serif text-[24px]">{p.name}</h2>
            <p className="flex flex-col"><span className="text-[28px] font-semibold">{p.price}</span><span className="text-[14px] text-muted">{p.period}</span></p>
            <p className="text-[15px]"><strong>{p.allowance}</strong> A walk over two hours counts as two; tailoring a walk counts as one. Re-checking hours and weather, around me and reopening a walk are free.</p>
            <p className="text-[15px] text-muted">{p.blurb}</p>
            <div className="mt-auto"><PlanButton plan={p.id} label={`Get the ${p.name.toLowerCase()}`} ready={ready} /></div>
          </section>
        ))}
      </div>
      <section className="flex flex-col gap-2 text-[14px] text-muted">
        <p>Prices include VAT. Payment is taken by Stripe; we never see your card. Walks start straight away, so the 14-day right to cancel a digital purchase is waived once the first walk is built; the monthly plan can be cancelled at any time from your account and runs to the end of the paid month.</p>
        <p className="flex gap-4"><Link className="underline" href="/terms">Terms</Link><Link className="underline" href="/privacy">Privacy</Link></p>
      </section>
    </main>
  );
}
