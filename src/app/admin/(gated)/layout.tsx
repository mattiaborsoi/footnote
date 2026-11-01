import type { Metadata } from "next";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import AdminNav from "@/components/admin/AdminNav";
import { readsMirror } from "@/lib/admin/db";
import { requireAdmin } from "@/lib/admin/gate";
import { marksOf } from "@/lib/admin/queries";
import { ago } from "@/components/admin/ui";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Dashboard" }, robots: { index: false } };

/** Every dashboard page sits behind the gate; the nav says which database it is reading. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-4">
        <Logo />
        <Suspense fallback={null}><Gate>{children}</Gate></Suspense>
      </header>
    </main>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const pulled = readsMirror() ? (await marksOf("mirror.pulled")).get("prod") : null;
  const source = readsMirror() ? `Reading the production mirror, pulled ${ago(pulled)}` : "Reading this instance's own database";
  return (
    <>
      <AdminNav source={source} />
      <div className="flex flex-col gap-6">{children}</div>
    </>
  );
}
