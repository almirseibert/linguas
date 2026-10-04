import { isoDate } from "@passaporte/shared";
import { db } from "../db/knex.ts";
import { claude } from "./claude.ts";
import { gemini } from "./gemini.ts";
import { AIError, type AIProvider, type ProviderName } from "./types.ts";

export * from "./types.ts";

export const PROVIDERS: Record<ProviderName, AIProvider> = { claude, gemini };

export const isProvider = (v: unknown): v is ProviderName => v === "claude" || v === "gemini";

/** Provedor preferido (membro > família > .env); se não tiver chave configurada, usa o outro. */
export function pickProvider(preferred?: string | null): AIProvider {
  const first = isProvider(preferred) ? preferred : isProvider(process.env.AI_DEFAULT_PROVIDER) ? process.env.AI_DEFAULT_PROVIDER : "claude";
  const order: ProviderName[] = first === "claude" ? ["claude", "gemini"] : ["gemini", "claude"];
  const p = order.map((n) => PROVIDERS[n]).find((x) => x.available());
  if (!p) throw new AIError("Nenhuma IA configurada: defina ANTHROPIC_API_KEY ou GEMINI_API_KEY no .env.", 503);
  return p;
}

export function providerStatus() {
  return Object.values(PROVIDERS).map((p) => ({ name: p.name, available: p.available() }));
}

/** Conta uma chamada e barra quem passou do limite diário (controle de custo). */
export async function chargeAiCall(memberId: number) {
  const limit = Number(process.env.AI_DAILY_LIMIT ?? 150);
  const date = isoDate();
  const row = await db("ai_usage").where({ member_id: memberId, date }).first();
  if (row && row.calls >= limit) throw new AIError("Limite diário de uso da IA atingido. Volte amanhã!", 429);
  if (row) await db("ai_usage").where({ member_id: memberId, date }).increment("calls", 1);
  else await db("ai_usage").insert({ member_id: memberId, date, calls: 1 });
}
