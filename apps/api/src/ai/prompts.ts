import { LANGUAGES, type LangCode } from "@passaporte/shared";
import { z } from "zod";

const LEVEL_BY_PHASE: Record<number, string> = {
  1: "absolute beginner (CEFR A1): very short sentences, present tense, the 500 most common words",
  2: "elementary (CEFR A2): short sentences, past and future, everyday vocabulary",
  3: "intermediate (CEFR B1): natural everyday speech, opinions, stories, common idioms",
};

export const levelFor = (phase: number) => LEVEL_BY_PHASE[phase] ?? LEVEL_BY_PHASE[3];

// ---------- Conversa ----------

export const TalkReply = z.object({
  reply: z.string().describe("Your next message in the target language, 1-3 short sentences, ending with a question."),
  reply_pt: z.string().describe("Portuguese translation of reply."),
  corrections: z
    .array(
      z.object({
        original: z.string().describe("What the learner wrote/said (only the part with the error)."),
        corrected: z.string().describe("A natural, correct full sentence in the target language."),
        explanation_pt: z.string().describe("Very short explanation in Brazilian Portuguese."),
      }),
    )
    .describe("Errors in the learner's LAST message only. Empty if it was fine. Ignore punctuation and capitalization."),
});
export type TalkReply = z.infer<typeof TalkReply>;

export function talkSystem(lang: LangCode, phase: number, topic: string) {
  const L = LANGUAGES[lang];
  return [
    `You are a warm, patient conversation partner helping a Brazilian adult become fluent in ${L.nativeName}.`,
    L.variantNote,
    `Learner level: ${levelFor(phase)}. Stay at or just slightly above this level.`,
    `Topic for today: ${topic}.`,
    "Rules:",
    "- Always reply in the target language only (the Portuguese goes in reply_pt).",
    "- Keep the learner talking: short replies, one question at a time, about their real life.",
    "- Use recasts: naturally reuse the corrected form of their mistake in your reply, without lecturing.",
    "- If the learner writes in Portuguese, give them the target-language way to say it in corrections, then continue.",
    "- Speech-to-text may drop punctuation or mishear similar words: do not flag those as errors.",
  ].join("\n");
}

export const TalkOpening = z.object({
  reply: z.string(),
  reply_pt: z.string(),
});

// ---------- Leitura (input compreensível) ----------

export const ReadingText = z.object({
  title: z.string(),
  paragraphs: z.array(z.string()).describe("2-4 short paragraphs in the target language."),
  translation_pt: z.array(z.string()).describe("Portuguese translation, one entry per paragraph."),
  glossary: z
    .array(z.object({ term: z.string(), meaning_pt: z.string(), example: z.string() }))
    .describe("The 3-6 words or expressions most likely to be new for this learner."),
});
export type ReadingText = z.infer<typeof ReadingText>;

export function readingSystem(lang: LangCode, phase: number) {
  const L = LANGUAGES[lang];
  return [
    `You write graded reading texts in ${L.nativeName} for Brazilian adults learning the language as a family.`,
    L.variantNote,
    "The goal is comprehensible input: the learner must already understand about 95% of the words.",
    "Write about everyday family life, work, food, travel, feelings, plans — concrete and useful.",
    "Prefer high-frequency words; repeat key new words 2-3 times inside the text.",
    "Original text only; never reproduce copyrighted material.",
  ].join("\n");
}

export function readingRequest(phase: number, topic: string, knownSample: string[], retryNote?: string) {
  return [
    `Level: ${levelFor(phase)}.`,
    `Topic: ${topic}.`,
    knownSample.length ? `Words the learner already knows (prefer these): ${knownSample.join(", ")}.` : "",
    retryNote ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------- Explicar palavra ----------

export const WordInfo = z.object({
  meaning_pt: z.string(),
  example: z.string().describe("A simple example sentence in the target language using the word."),
  example_pt: z.string(),
});

export function wordSystem(lang: LangCode) {
  const L = LANGUAGES[lang];
  return `You explain ${L.nativeName} words to Brazilian learners in Brazilian Portuguese, briefly. ${L.variantNote}`;
}
