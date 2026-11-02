/** One colour per place category, for marker halos and the card accents. Lightness differs too, never hue alone. */
export const CATEGORY_COLOR: Record<string, string> = {
  park: "#4f8a5b",
  cafe: "#b7791f",
  art: "#7c4d9b",
  museum: "#a0522d",
  view: "#0e7490",
  architecture: "#1e3a8a",
  memorial: "#6b7280",
  shop: "#9d174d",
  place: "#475569",
};
export const colorFor = (category: string) => CATEGORY_COLOR[category] ?? "#1e3a8a";
