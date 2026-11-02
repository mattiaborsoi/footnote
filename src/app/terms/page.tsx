import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Terms" };

/** The deal, in plain words. Reviewed before launch. */
export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-6 py-8 text-[16px] leading-relaxed">
      <Logo />
      <h1 className="font-serif text-[34px] leading-[1.1] tracking-tight">Terms</h1>
      <p className="text-muted">Draft for the test period; it will be reviewed before launch.</p>
      <h2 className="font-serif text-[22px]">The service</h2>
      <p>Footnote builds walks from open map data and published recommendations. Stops, opening hours and timings are checked but can be wrong or out of date: look before you cross, and treat an opening time as a plan, not a promise.</p>
      <h2 className="font-serif text-[22px]">Trial and passes</h2>
      <p>The first two walks are free. A week pass lasts seven days from payment and does not renew, and holds as many walks as a week holds at fair use, ten a day. The monthly plan renews each month until you cancel from your account, covers the stated number of walks a month, and cancelling keeps the rest of the paid month. A walk over two hours counts as two; a walk served from our cache is not counted. Prices include VAT and are shown before you pay.</p>
      <h2 className="font-serif text-[22px]">Cancelling a purchase</h2>
      <p>Walks are digital content supplied straight away. By buying a pass you ask us to start at once and accept that the 14-day right to cancel ends when the first walk of the pass is built. If something is broken on our side, write to us through the feedback button and we will put it right or refund.</p>
      <h2 className="font-serif text-[22px]">Fair use</h2>
      <p>One account per person. Sign-in is by email; keep your inbox safe. Do not resell walks or scrape the service.</p>
      <h2 className="font-serif text-[22px]">Attribution</h2>
      <p>Map data © OpenStreetMap contributors (ODbL). Stories draw on Wikipedia (CC BY-SA) and the linked sources, which are credited on each stop.</p>
      <p className="flex gap-4"><Link className="underline" href="/privacy">Privacy</Link><Link className="underline" href="/">Home</Link></p>
    </main>
  );
}
