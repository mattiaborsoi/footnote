import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

describe("maintenance switch", () => {
  const dir = mkdtempSync(join(tmpdir(), "fn-"));
  afterEach(() => { delete process.env.MAINTENANCE_FILE; });
  it("is off without the file, on with it, and escapes the message", async () => {
    process.env.MAINTENANCE_FILE = join(dir, "maintenance.json");
    const { maintenance, maintenancePage } = await import("@/lib/maintenance");
    // the module reads the path at import; this test's path was set first
    expect(maintenance().on).toBe(false);
    writeFileSync(process.env.MAINTENANCE_FILE, JSON.stringify({ message: "Back <soon>" }));
    const m = maintenance();
    expect(m).toMatchObject({ on: true, message: "Back <soon>" });
    expect(maintenancePage("Back <soon>")).toContain("Back &lt;soon&gt;");
    rmSync(dir, { recursive: true, force: true });
  });
});
