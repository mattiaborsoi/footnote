import { maintenance } from "@/lib/maintenance";

export function GET() {
  return Response.json({ ok: true, service: "footnote", time: new Date().toISOString(), maintenance: maintenance().on });
}
