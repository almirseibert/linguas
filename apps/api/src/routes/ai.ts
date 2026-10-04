import { coverage, LANGUAGES } from "@passaporte/shared";
import { Router, type Request } from "express";
import { z } from "zod";
import { chargeAiCall, pickProvider, providerStatus, type ChatTurn } from "../ai/index.ts";
import {
  ReadingText, readingRequest, readingSystem, TalkOpening, TalkReply, talkSystem, WordInfo, wordSystem,
} from "../ai/prompts.ts";
import { db, fromJson, insertId, toJson } from "../db/knex.ts";
import { knownWordSet } from "../learning.ts";
import { addCard } from "../srs.ts";
import { langOf } from "./study.ts";

export const aiRouter = Router();

async function providerFor(req: Request) {
  const family = await db("families").where({ id: req.member!.family_id }).first("ai_provider");
  const provider = pickProvider(req.member!.ai_provider ?? family?.ai_provider);
  await chargeAiCall(req.member!.id);
  return provider;
}

aiRouter.get("/providers", (_req, res) => {
  res.json(providerStatus());
});

const TOPICS: Record<number, string[]> = {
  1: ["your morning routine", "your family", "food you like", "your house", "the weather today", "your weekend"],
  2: ["what you did yesterday", "your work or studies", "a trip you remember", "plans for next weekend", "a movie or series you watched", "cooking dinner"],
  3: ["a decision you made recently", "something you would change in your city", "a funny story from your childhood", "technology in your life", "your dream holiday", "a habit you want to build"],
};
const randomTopic = (phase: number) => {
  const list = TOPICS[phase] ?? TOPICS[3];
  return list[Math.floor(Math.random() * list.length)];
};

// ---------- Leitura i+1 ----------

aiRouter.post("/reading", async (req, res) => {
  const { topic } = z.object({ topic: z.string().max(200).optional() }).parse(req.body ?? {});
  const { lang, phase, estVocab } = await langOf(req);
  const provider = await providerFor(req);
  const known = await knownWordSet(req.member!.id, lang, estVocab);
  const sample = [...known].slice(0, 400);
  const chosenTopic = topic || randomTopic(phase);

  // Gera; se a cobertura ficar abaixo de 92%, pede uma versão mais simples (uma vez)
  let text = await provider.generateJson({
    system: readingSystem(lang, phase),
    turns: [{ role: "user", text: readingRequest(phase, chosenTopic, sample) }],
    schema: ReadingText,
    tier: "main",
  });
  let cov = coverage(text.paragraphs.join(" "), known);
  if (known.size > 300 && cov.ratio < 0.92) {
    text = await provider.generateJson({
      system: readingSystem(lang, phase),
      turns: [{
        role: "user",
        text: readingRequest(phase, chosenTopic, sample, `Your previous version was too hard. Avoid these words: ${cov.unknown.slice(0, 40).join(", ")}.`),
      }],
      schema: ReadingText,
      tier: "main",
    });
    cov = coverage(text.paragraphs.join(" "), known);
  }

  res.json({ ...text, topic: chosenTopic, coverage: cov.ratio, unknown: cov.unknown, provider: provider.name, speechTag: LANGUAGES[lang].speechTag });
});

aiRouter.post("/word", async (req, res) => {
  const { word, context } = z.object({ word: z.string().trim().min(1).max(60), context: z.string().max(600).optional() }).parse(req.body);
  const { lang } = await langOf(req);
  const provider = await providerFor(req);
  const info = await provider.generateJson({
    system: wordSystem(lang),
    turns: [{ role: "user", text: `Word: "${word}"${context ? `\nContext sentence: ${context}` : ""}` }],
    schema: WordInfo,
    tier: "fast",
    maxTokens: 600,
  });
  res.json(info);
});

// ---------- Conversa ----------

aiRouter.post("/talk", async (req, res) => {
  const { topic } = z.object({ topic: z.string().max(200).optional() }).parse(req.body ?? {});
  const { lang, phase } = await langOf(req);
  const provider = await providerFor(req);
  const chosenTopic = topic || randomTopic(phase);

  const opening = await provider.generateJson({
    system: talkSystem(lang, phase, chosenTopic),
    turns: [{ role: "user", text: `(Start the conversation: greet the learner by name, ${req.member!.name}, and ask a first easy question about the topic.)` }],
    schema: TalkOpening,
    tier: "main",
    maxTokens: 800,
  });

  const id = await insertId(db("conversations").insert({ member_id: req.member!.id, lang, topic: chosenTopic, provider: provider.name }));
  await db("messages").insert({ conversation_id: id, role: "assistant", text: opening.reply, corrections: toJson({ reply_pt: opening.reply_pt }) });
  res.status(201).json({ id, topic: chosenTopic, provider: provider.name, speechTag: LANGUAGES[lang].speechTag, message: opening });
});

aiRouter.get("/talk/:id", async (req, res) => {
  const conv = await db("conversations").where({ id: Number(req.params.id), member_id: req.member!.id }).first();
  if (!conv) return res.status(404).json({ error: "Conversa não encontrada." });
  const messages = await db("messages").where({ conversation_id: conv.id }).orderBy("id");
  res.json({
    ...conv,
    speechTag: LANGUAGES[conv.lang as keyof typeof LANGUAGES].speechTag,
    messages: messages.map((m) => ({ role: m.role, text: m.text, extra: fromJson(m.corrections, null) })),
  });
});

aiRouter.post("/talk/:id", async (req, res) => {
  const { text } = z.object({ text: z.string().trim().min(1).max(1000) }).parse(req.body);
  const conv = await db("conversations").where({ id: Number(req.params.id), member_id: req.member!.id }).first();
  if (!conv) return res.status(404).json({ error: "Conversa não encontrada." });
  const ml = await db("member_languages").where({ member_id: req.member!.id, lang: conv.lang }).first();
  const provider = await providerFor(req);

  const history = await db("messages").where({ conversation_id: conv.id }).orderBy("id").limit(40);
  const turns: ChatTurn[] = [
    { role: "user", text: "(Conversation start.)" },
    ...history.map((m) => ({ role: m.role as ChatTurn["role"], text: m.text })),
    { role: "user", text },
  ];

  const reply = await provider.generateJson({
    system: talkSystem(conv.lang, ml?.phase ?? 1, conv.topic),
    turns,
    schema: TalkReply,
    tier: "main",
    maxTokens: 1500,
  });

  await db("messages").insert({ conversation_id: conv.id, role: "user", text, corrections: toJson({ corrections: reply.corrections }) });
  await db("messages").insert({ conversation_id: conv.id, role: "assistant", text: reply.reply, corrections: toJson({ reply_pt: reply.reply_pt }) });

  // Cada erro vira um cartão de revisão com a forma correta
  for (const c of reply.corrections) {
    await addCard({ memberId: req.member!.id, lang: conv.lang, front: c.corrected, back: `${c.explanation_pt}\n(você disse: ${c.original})`, source: "talk" });
  }

  res.json(reply);
});
