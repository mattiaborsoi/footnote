/** JSON-line product events on stdout for now; a Postgres events table replaces the sink. Never logs free text. */
export function logEvent(type: string, fields: Record<string, unknown> = {}): void {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k === "notes" || k === "apiKey" || k === "authorization") continue;
    safe[k] = v;
  }
  console.log(JSON.stringify({ ts: new Date().toISOString(), type, ...safe }));
}
