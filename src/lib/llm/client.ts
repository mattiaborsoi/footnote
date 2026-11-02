import { z } from "zod";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type Usage = { promptTokens: number; completionTokens: number };
export type Transport = (req: { model: string; messages: ChatMessage[]; maxTokens: number }) => Promise<{ content: string; usage?: Usage }>;
export type LlmConfig = { baseUrl: string; apiKey: string; models: { interpret: string; curate: string } };

export class LlmError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
  /** A message the person can act on; never the raw provider text. */
  get userMessage(): string {
    if (this.status === 401 || this.status === 403) return "The model key was rejected.";
    if (this.status === 402) return "The model account has no credit left.";
    if (this.status === 429) return "The model is busy right now. Try again in a minute.";
    if (this.status === 422) return "The model gave an answer we could not use. Try again.";
    return "The model did not answer. Try again.";
  }
}

export function configFromEnv(env: Record<string, string | undefined> = process.env): LlmConfig {
  const baseUrl = env.LLM_BASE_URL;
  if (!baseUrl) throw new LlmError(500, "LLM_BASE_URL is not set");
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey: env.LLM_API_KEY ?? "",
    models: { interpret: env.LLM_MODEL_INTERPRET ?? "haiku", curate: env.LLM_MODEL_CURATE ?? "opus" },
  };
}

/** OpenAI-compatible chat completions over HTTP: LiteLLM in production, any local proxy in development. */
export function httpTransport(cfg: LlmConfig): Transport {
  return async ({ model, messages, maxTokens }) => {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      signal: AbortSignal.timeout(90_000),
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.4 }),
    });
    if (!res.ok) throw new LlmError(res.status, `model request failed with ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens ?? 0, completionTokens: data.usage.completion_tokens ?? 0 } : undefined,
    };
  };
}

/** Pulls the first JSON object out of a reply that may be fenced or padded with prose. */
export function extractJson(text: string): unknown {
  const unfenced = text.replace(/```(?:json)?/gi, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in the reply");
  return JSON.parse(unfenced.slice(start, end + 1));
}

export type AskResult<T> = { data: T; usage: Usage; attempts: number };

/**
 * Ask for JSON, validate it against a schema and an optional domain check, and retry once with the
 * error fed back. Anything still invalid is an LlmError(422): the caller decides what to do.
 */
export async function askJson<T>(
  transport: Transport,
  schema: z.ZodType<T>,
  req: { model: string; system: string; user: string; maxTokens?: number },
  check?: (data: T) => string | null,
): Promise<AskResult<T>> {
  const messages: ChatMessage[] = [
    { role: "system", content: req.system + "\nReply with a single JSON object and nothing else." },
    { role: "user", content: req.user },
  ];
  const usage: Usage = { promptTokens: 0, completionTokens: 0 };
  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const reply = await transport({ model: req.model, messages, maxTokens: req.maxTokens ?? 4000 });
    usage.promptTokens += reply.usage?.promptTokens ?? 0;
    usage.completionTokens += reply.usage?.completionTokens ?? 0;
    try {
      const parsed = schema.safeParse(extractJson(reply.content));
      if (!parsed.success) throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      const problem = check?.(parsed.data) ?? null;
      if (problem) throw new Error(problem);
      return { data: parsed.data, usage, attempts: attempt };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      messages.push({ role: "assistant", content: reply.content });
      messages.push({ role: "user", content: `That reply was invalid: ${lastError}. Reply again with only the corrected JSON object.` });
    }
  }
  throw new LlmError(422, `invalid model reply after 2 attempts: ${lastError}`);
}
