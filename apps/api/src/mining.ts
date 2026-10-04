import { coverage, isoDate, tokenize } from "@passaporte/shared";
import { db, isSqlite } from "./db/knex.ts";
import { knownWordSet } from "./learning.ts";
import { addCard } from "./srs.ts";

/** Tamanho das frases por fase (em palavras) */
export const WORDS_BY_PHASE: Record<number, [number, number]> = { 1: [3, 6], 2: [5, 9], 3: [7, 12] };
const bandFor = (phase: number) => WORDS_BY_PHASE[phase] ?? WORDS_BY_PHASE[3];

export const NEW_PER_DAY = Number(process.env.NEW_CARDS_PER_DAY ?? 8);

export interface Candidate {
  id: number;
  text: string;
  pt: string;
}

/**
 * Seleção i+1: frases com exatamente UMA palavra desconhecida, priorizando a palavra
 * desconhecida mais frequente (maior retorno por cartão). Uma frase por palavra-alvo.
 * `rank` = posição na lista de frequência; `foreign` = palavras que aparecem nas listas
 * dos dois idiomas (nomes próprios como "tom", cognatos) — não servem como alvo.
 */
export function selectIPlusOne(
  candidates: Candidate[],
  known: Set<string>,
  rank: Map<string, number>,
  foreign: Set<string>,
  count: number,
) {
  const picks: (Candidate & { target: string; rank: number })[] = [];
  for (const c of candidates) {
    const unknown = [...new Set(tokenize(c.text).filter((w) => !known.has(w)))];
    if (unknown.length !== 1) continue;
    const target = unknown[0];
    if (foreign.has(target) || !rank.has(target)) continue;
    picks.push({ ...c, target, rank: rank.get(target)! });
  }
  picks.sort((a, b) => a.rank - b.rank);
  const seen = new Set<string>();
  return picks.filter((p) => !seen.has(p.target) && seen.add(p.target)).slice(0, count);
}

const random = () => (isSqlite ? "random()" : "rand()");

async function candidates(lang: string, phase: number, limit: number): Promise<Candidate[]> {
  const [min, max] = bandFor(phase);
  return db("sentences").where({ lang }).whereBetween("word_count", [min, max]).orderByRaw(random()).limit(limit).select("id", "text", "pt");
}

/** Garante a cota diária de frases nativas novas na revisão. Devolve quantas foram adicionadas. */
export async function ensureDailyNewCards(memberId: number, lang: string, phase: number, estVocab: number) {
  const today = await db("cards").where({ member_id: memberId, lang, source: "mined", added_on: isoDate() }).count({ n: "*" }).first();
  const missing = NEW_PER_DAY - Number(today?.n ?? 0);
  if (missing <= 0) return 0;
  return mineCards(memberId, lang, phase, estVocab, missing);
}

export async function mineCards(memberId: number, lang: string, phase: number, estVocab: number, count: number) {
  const known = await knownWordSet(memberId, lang, estVocab);
  const already = new Set<number>(await db("cards").where({ member_id: memberId, lang }).whereNotNull("sentence_id").pluck("sentence_id"));
  const pool = (await candidates(lang, phase, 1500)).filter((c) => !already.has(c.id));
  if (!pool.length) return 0;

  const words = await db("words").where({ lang }).select("word", "rank");
  const rank = new Map(words.map((w) => [w.word as string, w.rank as number]));
  const foreign = new Set<string>(await db("words").where("lang", "<>", lang).pluck("word"));

  let added = 0;
  for (const p of selectIPlusOne(pool, known, rank, foreign, count)) {
    const id = await addCard({ memberId, lang, front: p.text, back: p.pt, focus: p.target, source: "mined", sentenceId: p.id });
    if (!id) continue;
    added++;
    await db("member_words").insert({ member_id: memberId, lang, word: p.target, status: "learning" }).onConflict(["member_id", "lang", "word"]).ignore();
  }
  return added;
}

/** Frases nativas para o shadowing: no tamanho da fase e com o máximo de palavras conhecidas. */
export async function shadowSentences(memberId: number, lang: string, phase: number, estVocab: number, count = 12) {
  const known = await knownWordSet(memberId, lang, estVocab);
  const pool = await candidates(lang, phase, 300);
  return pool
    .map((c) => ({ ...c, coverage: coverage(c.text, known).ratio }))
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, count);
}
