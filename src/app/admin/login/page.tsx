import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import AdminLogin from "@/components/admin/AdminLogin";
import { adminEnabled } from "@/lib/admin/gate";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default function AdminLoginPage() {
  if (!adminEnabled()) notFound();
  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-8 px-6 py-8">
      <Logo />
      <AdminLogin />
    </main>
  );
}
