import type { LatLng } from "../geo";
import { cached, USER_AGENT } from "./cache";

export type Weather = { summary: string; rainChance: number; tempC: number; nudge: string | null };

const BASE = process.env.OPENMETEO_URL ?? "https://api.open-meteo.com/v1/forecast";

type Hourly = { time: string[]; precipitation_probability: number[]; temperature_2m: number[]; weather_code: number[] };

/** One sentence about the walk's window, from hourly values that fall inside it. */
export function summarise(h: Hourly, from: Date, to: Date): Weather | null {
  const rows = h.time.map((t, i) => ({ t: new Date(t + "Z"), rain: h.precipitation_probability[i] ?? 0, temp: h.temperature_2m[i] ?? 0, code: h.weather_code[i] ?? 0 }))
    .filter((r) => r.t >= from && r.t <= to);
  if (!rows.length) return null;
  const rainChance = Math.max(...rows.map((r) => r.rain));
  const tempC = Math.round(rows.reduce((a, r) => a + r.temp, 0) / rows.length);
  const wet = rows.find((r) => r.rain >= 50);
  const hh = (d: Date) => d.toISOString().slice(11, 16);
  let summary: string;
  let nudge: string | null = null;
  if (rainChance >= 50) {
    summary = wet && wet !== rows[0] ? `Showers likely from ${hh(wet.t)}, ${tempC}°C` : `Showers likely, ${tempC}°C`;
    nudge = wet && wet !== rows[0] ? "Put parks and views first and indoor stops last." : "Favour indoor stops and short open-air legs.";
  } else if (rainChance >= 25) {
    summary = `Chance of a shower, ${tempC}°C`;
  } else if (rows.some((r) => r.code === 0 || r.code === 1)) {
    summary = `Fair, ${tempC}°C`;
  } else {
    summary = `Dry, ${tempC}°C`;
  }
  if (tempC >= 28) nudge = "Keep legs short and plan shade and water stops.";
  if (tempC <= 3) nudge = "Cold: favour indoor stops and warm cafés.";
  return { summary, rainChance, tempC, nudge };
}

/** Open-Meteo, free and keyless; the forecast covers about 16 days, beyond that the walk has no weather. */
export async function weatherFor(at: LatLng, from: Date, to: Date): Promise<Weather | null> {
  const day = from.toISOString().slice(0, 10);
  const dayTo = to.toISOString().slice(0, 10);
  if ((from.getTime() - Date.now()) / 86_400_000 > 15) return null;
  const url = `${BASE}?latitude=${at.lat.toFixed(3)}&longitude=${at.lon.toFixed(3)}&hourly=precipitation_probability,temperature_2m,weather_code&timezone=UTC&start_date=${day}&end_date=${dayTo}`;
  return cached(`wx:${url}`, 3600_000, async () => {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return null;
    const data = (await res.json()) as { hourly?: Hourly };
    return data.hourly ? summarise(data.hourly, from, to) : null;
  });
}
