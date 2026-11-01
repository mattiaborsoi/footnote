import type { Metadata } from "next";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import SignIn from "@/components/account/SignIn";
import { safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-8 px-6 py-8">
      <Logo />
      <Suspense fallback={null}><Body searchParams={searchParams} /></Suspense>
    </main>
  );
}

async function Body({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <SignIn next={safeNext(next)} />;
}
