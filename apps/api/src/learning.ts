import { isoDate, type LangCode } from "@passaporte/shared";
import { bool, db } from "./db/knex.ts";
import { addCard } from "./srs.ts";

export const BLOCKS = ["review", "input", "shadow", "talk"] as const;
export type Block = (typeof BLOCKS)[number];

/** Metas de minutos por bloco (sessão de ~35 min) */
export const BLOCK_MINUTES: Record<Block, number> = { review: 8, input: 10, shadow: 5, talk: 10 };

/** Garante que o membro estuda o idioma; na primeira vez, cria os cartões da fase 1. */
export async function ensureLanguage(memberId: number, lang: LangCode) {
  const existing = await db("member_languages").where({ member_id: memberId, lang }).first();
  if (existing) return existing;
  await db("member_languages").insert({ member_id: memberId, lang, phase: 1, phase_started: isoDate() });
  await seedPhaseCards(memberId, lang, 1);
  return db("member_languages").where({ member_id: memberId, lang }).first();
}

export async function seedPhaseCards(memberId: number, lang: string, phase: number) {
  const phrases = await db("content_items").where({ lang, phase, type: "phrase" });
  for (const p of phrases) {
    await addCard({ memberId, lang, front: p.content, back: p.content_pt ?? "", source: "seed" });
  }
}

/** Registra um bloco da sessão diária e marca o check-in correspondente automaticamente. */
export async function completeBlock(memberId: number, lang: string, block: Block, minutes: number) {
  const date = isoDate();
  const row = await db("session_blocks").where({ member_id: memberId, lang, date, block }).first();
  if (row) await db("session_blocks").where({ id: row.id }).update({ minutes: Math.max(row.minutes, minutes) });
  else await db("session_blocks").insert({ member_id: memberId, lang, date, block, minutes });

  await setCheckin(memberId, date, block === "review" || block === "input" ? { did_input: true } : { did_speak: true });
  await maybeAdvancePhase(memberId, lang);
}

export async function setCheckin(
  memberId: number,
  date: string,
  patch: Partial<Record<"did_input" | "did_speak" | "did_family", boolean>>,
) {
  const row = await db("checkins").where({ member_id: memberId, date }).first();
  if (row) await db("checkins").where({ id: row.id }).update(patch);
  else await db("checkins").insert({ member_id: memberId, date, did_input: false, did_speak: false, did_family: false, ...patch });
}

/**
 * Progressão automática: avança de fase quando a pessoa tem dias suficientes de prática
 * completa nesta fase (todos os 4 blocos) e o vocabulário estimado acompanha.
 */
const ADVANCE_RULES: Record<number, { fullDays: number; vocab: number }> = {
  1: { fullDays: 20, vocab: 600 },
  2: { fullDays: 45, vocab: 1500 },
};

export async function maybeAdvancePhase(memberId: number, lang: string) {
  const ml = await db("member_languages").where({ member_id: memberId, lang }).first();
  const rule = ml && ADVANCE_RULES[ml.phase];
  if (!rule) return;

  const fullDays = await db("session_blocks")
    .where({ member_id: memberId, lang })
    .andWhere("date", ">=", ml.phase_started ?? "0000-00-00")
    .groupBy("date")
    .havingRaw("count(distinct block) >= ?", [BLOCKS.length])
    .select("date");
  const vocab = await knownWordCount(memberId, lang, ml.est_vocab);

  if (fullDays.length >= rule.fullDays && vocab >= rule.vocab) {
    const phase = ml.phase + 1;
    await db("member_languages").where({ id: ml.id }).update({ phase, phase_started: isoDate() });
    await seedPhaseCards(memberId, lang, phase);
  }
}

/** Vocabulário = estimativa do nivelamento + palavras marcadas como conhecidas fora dessa faixa. */
export async function knownWordCount(memberId: number, lang: string, estVocab: number) {
  const extra = await db("member_words as mw")
    .leftJoin("words as w", function () {
      this.on("w.lang", "mw.lang").andOn("w.word", "mw.word");
    })
    .where({ "mw.member_id": memberId, "mw.lang": lang, "mw.status": "known" })
    .andWhere((q) => q.whereNull("w.rank").orWhere("w.rank", ">", estVocab))
    .count({ n: "*" })
    .first();
  return estVocab + Number(extra?.n ?? 0);
}

/** Conjunto de palavras conhecidas (para medir cobertura dos textos gerados). */
export async function knownWordSet(memberId: number, lang: string, estVocab: number): Promise<Set<string>> {
  const fromList = await db("words").where({ lang }).andWhere("rank", "<=", Math.max(estVocab, 300)).pluck("word");
  const marked = await db("member_words").where({ member_id: memberId, lang, status: "known" }).pluck("word");
  const learning = await db("member_words").where({ member_id: memberId, lang, status: "learning" }).pluck("word");
  return new Set([...fromList, ...marked, ...learning]);
}

export async function todayStatus(memberId: number, lang: string) {
  const date = isoDate();
  const done = await db("session_blocks").where({ member_id: memberId, lang, date });
  const checkin = await db("checkins").where({ member_id: memberId, date }).first();
  return {
    date,
    blocks: BLOCKS.map((b) => {
      const r = done.find((d) => d.block === b);
      return { block: b, target: BLOCK_MINUTES[b], done: Boolean(r), minutes: r?.minutes ?? 0 };
    }),
    checkin: {
      did_input: bool(checkin?.did_input),
      did_speak: bool(checkin?.did_speak),
      did_family: bool(checkin?.did_family),
    },
  };
}
