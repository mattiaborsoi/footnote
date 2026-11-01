import type { ReactNode } from "react";

export const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap";
export const td = "px-3 py-2 align-top text-[13px]";

export function Card({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-line p-4">
      <div className="flex items-baseline justify-between gap-3"><h2 className="font-serif text-[20px]">{title}</h2>{aside}</div>
      {children}
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="flex min-w-[120px] flex-col gap-0.5 rounded-xl bg-soft px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      <span className="font-serif text-[26px] leading-none">{value}</span>
      {note ? <span className="text-[12px] text-muted">{note}</span> : null}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead><tr className="border-b-2 border-line">{head.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const when = (d: Date | string | null | undefined) => d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
export const ago = (d: Date | string | null | undefined) => {
  if (!d) return "never";
  const h = (Date.now() - new Date(d).getTime()) / 3_600_000;
  return h < 1 ? `${Math.round(h * 60)} min ago` : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;
};
