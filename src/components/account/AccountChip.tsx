"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { type Me, whoAmI } from "@/lib/client/walks";

/** Top-right of the home screen: "Sign in", or the person's initial leading to their account. */
export default function AccountChip() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  useEffect(() => { void whoAmI().then(setMe); }, []);
  if (me === undefined) return <span className="inline-block h-11 w-11" aria-hidden />;
  const user = me?.user;
  return user ? (
    <Link href="/account" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-line font-semibold uppercase text-ink" aria-label="Your account" title={user.email}>{user.email.slice(0, 1)}</Link>
  ) : (
    <Link href="/signin" className="flex min-h-11 items-center rounded-full border-2 border-line px-4 text-[14px] font-semibold text-ink">Sign in</Link>
  );
}
