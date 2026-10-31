import { describe, expect, it } from "vitest";
import { summarise } from "@/lib/providers/openmeteo";

const hourly = (rain: number[], temp = 14, code = 3) => ({
  time: rain.map((_, i) => `2026-03-14T${String(13 + i).padStart(2, "0")}:00`),
  precipitation_probability: rain,
  temperature_2m: rain.map(() => temp),
  weather_code: rain.map(() => code),
});
const from = new Date("2026-03-14T14:00:00Z"), to = new Date("2026-03-14T17:00:00Z");

describe("summarise", () => {
  it("names the hour showers start and nudges parks first", () => {
    const w = summarise(hourly([10, 10, 20, 70, 80]), from, to)!;
    expect(w.summary).toBe("Showers likely from 16:00, 14°C");
    expect(w.nudge).toMatch(/parks and views first/);
    expect(w.rainChance).toBe(80);
  });
  it("is quiet on a dry day", () => {
    const w = summarise(hourly([5, 5, 5, 5, 5], 16, 1), from, to)!;
    expect(w.summary).toBe("Fair, 16°C");
    expect(w.nudge).toBeNull();
  });
  it("warns about cold", () => {
    expect(summarise(hourly([0, 0, 0, 0, 0], 1), from, to)!.nudge).toMatch(/Cold/);
  });
  it("returns null when no hours fall in the window", () => {
    expect(summarise(hourly([0]), new Date("2027-01-01T00:00:00Z"), new Date("2027-01-01T01:00:00Z"))).toBeNull();
  });
});
