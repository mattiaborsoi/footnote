/** Model cost from tokens and the prices per million in the environment; zero when no prices are set. */
export function estimateCost(promptTokens: number, completionTokens: number, inPerM = num("LLM_PRICE_IN_PER_M"), outPerM = num("LLM_PRICE_OUT_PER_M")): number {
  return (promptTokens / 1e6) * inPerM + (completionTokens / 1e6) * outPerM;
}

export const currency = () => process.env.LLM_PRICE_CURRENCY ?? "$";

function num(name: string): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
