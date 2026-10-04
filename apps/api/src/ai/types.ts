import type { z } from "zod";

export type ProviderName = "claude" | "gemini";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface JsonRequest<S extends z.ZodType> {
  /** Instruções estáveis (ficam em cache no Claude) */
  system: string;
  turns: ChatTurn[];
  schema: S;
  /** "main" = melhor qualidade (conversa, textos); "fast" = tarefas simples e baratas */
  tier: "main" | "fast";
  maxTokens?: number;
}

export interface AIProvider {
  name: ProviderName;
  available(): boolean;
  generateJson<S extends z.ZodType>(req: JsonRequest<S>): Promise<z.infer<S>>;
}

export class AIError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}
