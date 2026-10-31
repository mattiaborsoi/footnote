/** Read a server-sent-events body from fetch, event by event. POST bodies need this; EventSource only does GET. */
export async function readSse(res: Response, onEvent: (event: string, data: unknown) => void): Promise<void> {
  if (!res.body) throw new Error("no response body");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      parseChunk(chunk, onEvent);
    }
  }
  if (buf.trim()) parseChunk(buf, onEvent);
}

export function parseChunk(chunk: string, onEvent: (event: string, data: unknown) => void): void {
  let event = "message";
  const data: string[] = [];
  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return;
  try {
    onEvent(event, JSON.parse(data.join("\n")));
  } catch {
    onEvent(event, data.join("\n"));
  }
}
