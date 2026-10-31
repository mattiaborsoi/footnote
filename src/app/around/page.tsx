import type { Metadata } from "next";
import AroundView from "@/components/around/AroundView";

export const metadata: Metadata = { title: "Around me" };

export default function AroundPage() {
  return <AroundView />;
}
