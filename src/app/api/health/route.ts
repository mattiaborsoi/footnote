export function GET() {
  return Response.json({
    ok: true,
    service: "footnote",
    time: new Date().toISOString(),
  });
}
