/** Runs once when the server starts: apply migrations, then prune on a daily timer. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { migrateDb, startPruning } = await import("./lib/db/lifecycle");
  try {
    await migrateDb();
    startPruning();
  } catch (e) {
    console.error("database setup failed; walks will not be stored", e);
  }
}
