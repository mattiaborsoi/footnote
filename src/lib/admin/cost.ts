import { envNumber } from "../env";

/** Model cost from tokens and the prices per million in the environment; zero when no prices are set. */
export function estimateCost(promptTokens: number, completionTokens: number, inPerM = envNumber("LLM_PRICE_IN_PER_M", 0), outPerM = envNumber("LLM_PRICE_OUT_PER_M", 0)): number {
  return (promptTokens / 1e6) * inPerM + (completionTokens / 1e6) * outPerM;
}

export const currency = () => process.env.LLM_PRICE_CURRENCY ?? "$";
