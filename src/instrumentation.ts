/** Runs once when the server starts: refuse example secrets in production, apply migrations, prune on a daily timer, start the scout scheduler. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production") {
    for (const name of ["AUTH_SECRET", "ADMIN_TOKEN"]) {
      const v = process.env[name] ?? "";
      if (v.length < 24 || /change-me|example/i.test(v)) throw new Error(`${name} is missing or still the example value; refusing to start`);
    }
  }
  const { migrateDb, startPruning } = await import("./lib/db/lifecycle");
  const { startScheduler } = await import("./lib/scout/scheduler");
  try {
    await migrateDb();
    startPruning();
    startScheduler();
  } catch (e) {
    console.error("database setup failed; walks will not be stored", e);
  }
}
