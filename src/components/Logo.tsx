import Link from "next/link";

/** The mark: a route line arriving at a numbered stop. The wordmark carries its own footnote. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Footnote">
      <rect width="64" height="64" rx="14" fill="#1e3a8a" />
      <path d="M10 54 C 18 40, 22 44, 28 36 S 40 22, 42 26" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
      <circle cx="44" cy="22" r="13" fill="#ffffff" />
      <text x="44" y="28.5" textAnchor="middle" fontFamily="var(--font-fraunces), Georgia, serif" fontSize="19" fontWeight="600" fill="#1e3a8a">1</text>
    </svg>
  );
}

export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight" aria-label="Footnote, home">
      <Mark size={size} />
      <span>Footnote<sup className="ml-0.5 text-[0.55em] font-medium text-ink">1</sup></span>
    </Link>
  );
}
