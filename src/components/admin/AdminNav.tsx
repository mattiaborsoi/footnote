"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ITEMS: [string, string][] = [["/admin", "Overview"], ["/admin/feedback", "Feedback"], ["/admin/people", "People"], ["/admin/walks", "Walks"], ["/admin/events", "Events"], ["/admin/cities", "Cities"]];

export default function AdminNav({ source }: { source: string }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Dashboard">
      {ITEMS.map(([href, label]) => <Link key={href} href={href} className={`flex min-h-10 items-center rounded-full px-4 text-[14px] font-semibold ${path === href ? "bg-text text-paper" : "border-2 border-line"}`}>{label}</Link>)}
      <span className="ml-auto text-[12px] text-muted">{source}</span>
      <button type="button" className="min-h-10 rounded-full border-2 border-line px-4 text-[14px] font-semibold" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }}>Close</button>
    </nav>
  );
}
