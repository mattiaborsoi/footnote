import { expect, it } from "vitest";
import { displayName } from "@/lib/names";

it("prefers the walker's language, then English, then the local name, keeping the local one aside", () => {
  const tags = { name: "Ακρόπολη", "name:en": "Acropolis", "name:fr": "Acropole" };
  expect(displayName(tags, "en")).toEqual({ name: "Acropolis", localName: "Ακρόπολη" });
  expect(displayName(tags, "fr")).toEqual({ name: "Acropole", localName: "Ακρόπολη" });
  expect(displayName(tags, "el")).toEqual({ name: "Ακρόπολη", localName: null });
  expect(displayName({ name: "Bath Abbey" }, "it")).toEqual({ name: "Bath Abbey", localName: null });
  expect(displayName({ name: "Λ", int_name: "Lambda" }, "en")).toEqual({ name: "Lambda", localName: "Λ" });
});
