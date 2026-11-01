import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Privacy" };

/** What is kept, for how long, and why. Short because the list is short. Reviewed before launch. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-6 py-8 text-[16px] leading-relaxed">
      <Logo />
      <h1 className="font-serif text-[34px] leading-[1.1] tracking-tight">Privacy notice</h1>
      <p className="text-muted">Draft for the test period; it will be reviewed before launch.</p>
      <h2 className="font-serif text-[22px]">What we keep</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li><strong>Your requests and walks.</strong> The place, time, company and interests you give us, and the walk we build, stored under the walk&apos;s link. The optional free-text line is deleted after 90 days.</li>
        <li><strong>Product events.</strong> What was asked, how long each step took, what was tapped and any error, with an id your browser made up, for 90 days. No advertising, no trackers, no analytics cookie.</li>
        <li><strong>Your email</strong>, when you sign in, with the walks you keep and your pass. Sign-in codes expire after 15 minutes.</li>
        <li><strong>Feedback</strong> you send through the bug button, with the screen and walk it was about, for a year.</li>
        <li><strong>Payments</strong> are handled by Stripe; we store a customer reference and the state of your pass, never card details.</li>
      </ul>
      <h2 className="font-serif text-[22px]">Cookies</h2>
      <p>One, only after you sign in, and only to keep you signed in. Nothing else is set.</p>
      <h2 className="font-serif text-[22px]">Who else sees data</h2>
      <p>Map, geocoding, routing and weather services receive the coordinates needed to answer; the model provider receives your request and the candidate places, never your email. Stripe receives what a payment needs.</p>
      <h2 className="font-serif text-[22px]">Your rights</h2>
      <p>Under UK GDPR you can ask for a copy of what we hold about you, or for it to be deleted. Write to us through the feedback button and we will answer within a month.</p>
      <p><Link className="underline" href="/terms">Terms</Link> · <Link className="underline" href="/">Home</Link></p>
    </main>
  );
}
