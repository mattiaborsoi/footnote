import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

/** Walk pages are private links, the API is not a page, and the model crawlers get nothing: a walk costs money to serve. */
const AI_CRAWLERS = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "Google-Extended", "CCBot", "PerplexityBot", "Perplexity-User", "Bytespider", "Amazonbot", "Applebot-Extended", "meta-externalagent", "FacebookBot", "cohere-ai", "Diffbot", "omgili", "ImagesiftBot", "YouBot", "Timpibot", "PetalBot", "AI2Bot", "DuckAssistBot", "MistralAI-User"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      { userAgent: "*", allow: ["/", "/plans", "/privacy", "/terms", "/city/"], disallow: ["/api/", "/w/", "/admin", "/account", "/signin", "/tailor", "/around"] },
    ],
    host: appUrl(),
  };
}
