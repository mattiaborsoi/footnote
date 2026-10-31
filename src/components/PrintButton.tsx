"use client";
export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="self-start rounded-xl border-2 border-[#d9d6ce] px-4 py-2 font-semibold print:hidden">Print this page</button>;
}
