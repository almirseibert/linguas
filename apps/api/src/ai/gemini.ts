import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { AIError, type AIProvider, type JsonRequest } from "./types.ts";

let client: GoogleGenAI | null = null;
const getClient = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

export const gemini: AIProvider = {
  name: "gemini",

  available: () => Boolean(process.env.GEMINI_API_KEY),

  async generateJson<S extends z.ZodType>(req: JsonRequest<S>): Promise<z.infer<S>> {
    const model =
      req.tier === "fast"
        ? (process.env.GEMINI_FAST_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash")
        : (process.env.GEMINI_MODEL ?? "gemini-2.5-flash");

    let text: string | undefined;
    try {
      const response = await getClient().models.generateContent({
        model,
        contents: req.turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] })),
        config: {
          systemInstruction: req.system,
          maxOutputTokens: req.maxTokens ?? 4000,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(req.schema),
        },
      });
      text = response.text;
    } catch (err) {
      throw new AIError(`Gemini: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!text) throw new AIError("Gemini não devolveu resposta.");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new AIError("Resposta do Gemini veio em formato inválido.");
    }
    const parsed = req.schema.safeParse(raw);
    if (!parsed.success) throw new AIError("Resposta do Gemini não bate com o formato esperado.");
    return parsed.data;
  },
};
