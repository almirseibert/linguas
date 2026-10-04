import { isoDate } from "@passaporte/shared";
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";
import { db, fromJson, insertId, toJson } from "./db/knex.ts";

// FSRS (open-spaced-repetition/ts-fsrs, MIT): retenção alvo de 90%, intervalo máximo de 1 ano
const scheduler = fsrs(generatorParameters({ request_retention: 0.9, maximum_interval: 365, enable_fuzz: true }));

export { Rating };

export interface NewCard {
  memberId: number;
  lang: string;
  front: string;
  back: string;
  focus?: string | null;
  source: "seed" | "reading" | "talk" | "manual" | "mined";
  sentenceId?: number | null;
}

/** Cria o cartão se ainda não existir um igual para a pessoa. Devolve o id (ou null se duplicado). */
export async function addCard(c: NewCard): Promise<number | null> {
  const front = c.front.trim();
  const exists = await db("cards").where({ member_id: c.memberId, lang: c.lang, front }).first("id");
  if (exists) return null;
  // Se a frase existe no banco do Tatoeba, o cartão ganha o áudio do falante nativo
  const sentenceId = c.sentenceId ?? (await db("sentences").where({ lang: c.lang, text: front }).first("id"))?.id ?? null;
  const card = createEmptyCard(new Date());
  return insertId(
    db("cards").insert({
      member_id: c.memberId,
      lang: c.lang,
      front,
      back: c.back.trim(),
      focus: c.focus ?? null,
      source: c.source,
      sentence_id: sentenceId,
      added_on: isoDate(),
      fsrs: toJson(card),
      due_at: card.due.toISOString(),
    }),
  );
}

function reviveCard(raw: unknown): Card {
  const c = fromJson<Card>(raw, createEmptyCard());
  return { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined };
}

export async function reviewCard(cardId: number, memberId: number, grade: Grade, elapsedMs?: number) {
  const row = await db("cards").where({ id: cardId, member_id: memberId }).first();
  if (!row) return null;
  const now = new Date();
  const { card } = scheduler.next(reviveCard(row.fsrs), now, grade);
  await db("cards").where({ id: cardId }).update({ fsrs: toJson(card), due_at: card.due.toISOString() });
  await db("review_logs").insert({ card_id: cardId, rating: grade, reviewed_at: now.toISOString(), elapsed_ms: elapsedMs ?? null });
  return { due_at: card.due.toISOString(), state: card.state };
}

/** Prévia dos intervalos de cada botão (ex.: "10min", "3d") para mostrar na tela de revisão. */
export function previewIntervals(raw: unknown): Record<string, string> {
  const now = new Date();
  const preview = scheduler.repeat(reviveCard(raw), now);
  const out: Record<string, string> = {};
  for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]) {
    const mins = Math.max(1, Math.round((preview[g].card.due.getTime() - now.getTime()) / 60000));
    out[g] = mins < 60 ? `${mins}min` : mins < 1440 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
  }
  return out;
}
