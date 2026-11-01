import type { Metadata } from "next";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import LinkContinue from "@/components/account/LinkContinue";

export const metadata: Metadata = { title: "Sign in" };

export default function LinkPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-8 px-6 py-8">
      <Logo />
      <Suspense fallback={null}><Body searchParams={searchParams} /></Suspense>
    </main>
  );
}

async function Body({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return <LinkContinue token={typeof t === "string" && /^[A-Za-z0-9_-]{20,}$/.test(t) ? t : ""} />;
}
