import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({ width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...props });

export const Icon = {
  nature: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 22V12" /><path d="M5 12a7 7 0 0 1 14 0c0 4-7 4-7 4s-7 0-7-4z" /></svg>,
  cafes: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M16 10h2a2 2 0 0 1 0 4h-2" /></svg>,
  history: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" /></svg>,
  modern: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 21V9l6 4V9l6 4V3l6 3v15z" /></svg>,
  craft: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6L7.1 18.2l.9-5.5-4-3.9L9.5 8z" /></svg>,
  views: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>,
  photo: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13.5" r="3.5" /><path d="M8 7l1.5-3h5L16 7" /></svg>,
  film: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 9h20M2 14h20M7 4v16M17 4v16" /></svg>,
  museums: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 10l9-6 9 6" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>,
  shops: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M6 2h12l2 7H4z" /><path d="M4 9v11h16V9" /></svg>,
  gaming: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="2" y="6" width="20" height="12" rx="4" /><path d="M7 10v4M5 12h4" /><circle cx="16" cy="11" r="1" /><circle cx="18" cy="13" r="1" /></svg>,
  technology: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h6v6H9z" /><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" /></svg>,
  me: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="7" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>,
  kids: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="9" cy="7" r="3" /><circle cx="17" cy="11" r="2.5" /><path d="M3 21a6 6 0 0 1 12 0" /><path d="M14 21a4 4 0 0 1 7 0" /></svg>,
  older: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="6" r="3" /><path d="M8 22l2-9h4l2 9" /><path d="M10 13l-4 2" /></svg>,
  limited_mobility: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="10" cy="17" r="4" /><circle cx="13" cy="5" r="2" /><path d="M13 7v6h5l2 4" /></svg>,
  pram: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 12h12a5 5 0 0 1 0 10H9" /><path d="M4 4v8" /><circle cx="8" cy="20" r="2" /><circle cx="18" cy="20" r="2" /></svg>,
  train: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14" /><path d="M9 7h6" /><circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" /><path d="M8 17l-2 4M16 17l2 4" /></svg>,
  layers: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 17.5l9 5 9-5" /></svg>,
  locate: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>,
  bug: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M8 2l1.5 2.5M16 2l-1.5 2.5" /><rect x="7" y="6" width="10" height="14" rx="5" /><path d="M12 6v14M3 12h4M17 12h4M4 7l3 2M20 7l-3 2M4 18l3-2M20 18l-3-2" /></svg>,
  back: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M15 5l-7 7 7 7" /></svg>,
  check: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M5 12.5l4 4 10-10" /></svg>,
  rain: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M7 17a4 4 0 0 1-1-7.9A6 6 0 0 1 17.5 8a4.5 4.5 0 0 1-.5 9H7z" /><path d="M9 20l1 2M13 20l1 2" /></svg>,
  up: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M7 11v10H3V11z" /><path d="M7 11l4-8a2.5 2.5 0 0 1 2.5 2.5V9h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.3 20H7" /></svg>,
  down: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M17 13V3h4v10z" /><path d="M17 13l-4 8a2.5 2.5 0 0 1-2.5-2.5V15h-5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.7 4H17" /></svg>,
  clock: (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
};
export type IconName = keyof typeof Icon;
