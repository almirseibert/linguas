import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { AIError, type AIProvider, type JsonRequest } from "./types.ts";

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export const claude: AIProvider = {
  name: "claude",

  available: () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),

  async generateJson<S extends z.ZodType>(req: JsonRequest<S>): Promise<z.infer<S>> {
    const model =
      req.tier === "fast"
        ? (process.env.CLAUDE_FAST_MODEL ?? "claude-haiku-4-5")
        : (process.env.CLAUDE_MODEL ?? "claude-opus-5");

    try {
      const response = await getClient().messages.parse({
        model,
        max_tokens: req.maxTokens ?? 4000,
        // System prompt estável primeiro, com cache: as chamadas seguintes do mesmo tipo leem do cache
        system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
        messages: req.turns.map((t) => ({ role: t.role, content: t.text })),
        output_config: {
          format: zodOutputFormat(req.schema),
          // Conversa e tarefas curtas não precisam de raciocínio longo: menor latência e custo
          ...(req.tier === "main" ? { effort: "low" as const } : {}),
        },
      });

      if (response.stop_reason === "refusal") throw new AIError("A IA recusou este pedido.", 422);
      if (response.parsed_output == null) throw new AIError("Resposta da IA veio em formato inválido.");
      return response.parsed_output as z.infer<S>;
    } catch (err) {
      if (err instanceof AIError) throw err;
      if (err instanceof Anthropic.RateLimitError) throw new AIError("Claude: limite de uso atingido, tente em instantes.", 429);
      if (err instanceof Anthropic.AuthenticationError) throw new AIError("Claude: chave de API inválida.", 500);
      if (err instanceof Anthropic.APIError) throw new AIError(`Claude: ${err.message}`);
      throw err;
    }
  },
};
