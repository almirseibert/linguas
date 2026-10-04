import { isLang, isoDate, type LangCode } from "@passaporte/shared";
import { Router, type Request } from "express";
import { z } from "zod";
import { db, fromJson, isSqlite } from "../db/knex.ts";
import { BLOCKS, completeBlock, ensureLanguage, knownWordCount, setCheckin, todayStatus } from "../learning.ts";
import { ensureDailyNewCards, mineCards, shadowSentences } from "../mining.ts";
import { addCard, previewIntervals, reviewCard } from "../srs.ts";

export const studyRouter = Router();

/** Idioma da requisição: ?lang= ou o idioma ativo do membro. */
export async function langOf(req: Request): Promise<{ lang: LangCode; phase: number; estVocab: number }> {
  const q = req.query.lang;
  const lang = isLang(q) ? q : isLang(req.member!.active_lang) ? req.member!.active_lang : "en";
  const ml = await ensureLanguage(req.member!.id, lang);
  return { lang, phase: ml.phase, estVocab: ml.est_vocab };
}

studyRouter.get("/today", async (req, res) => {
  const { lang, phase, estVocab } = await langOf(req);
  const due = await db("cards").where({ member_id: req.member!.id, lang }).andWhere("due_at", "<=", new Date().toISOString()).count({ n: "*" }).first();
  res.json({
    lang,
    phase,
    vocab: await knownWordCount(req.member!.id, lang, estVocab),
    dueCards: Number(due?.n ?? 0),
    ...(await todayStatus(req.member!.id, lang)),
  });
});

studyRouter.post("/block", async (req, res) => {
  const { block, minutes } = z.object({ block: z.enum(BLOCKS), minutes: z.number().int().min(0).max(240) }).parse(req.body);
  const { lang } = await langOf(req);
  await completeBlock(req.member!.id, lang, block, minutes);
  res.json(await todayStatus(req.member!.id, lang));
});

studyRouter.get("/content", async (req, res) => {
  const { lang, phase } = await langOf(req);
  const [phases, items, resources] = await Promise.all([
    db("phases").where({ lang }).orderBy("order"),
    db("content_items").where({ lang }).andWhere("phase", "<=", phase).orderBy(["phase", "id"]),
    db("resources").where({ lang }).orderBy("order"),
  ]);
  res.json({ lang, phase, phases, items, resources });
});

// ---------- Nivelamento ----------

const BANDS: [number, number][] = [[1, 250], [251, 500], [501, 1000], [1001, 2000], [2001, 3000], [3001, 5000]];
const PER_BAND = 8;

studyRouter.get("/placement", async (req, res) => {
  const { lang } = await langOf(req);
  const total = await db("words").where({ lang }).count({ n: "*" }).first();
  if (!Number(total?.n)) return res.status(503).json({ error: "Lista de palavras ainda não importada (npm run import:words)." });
  // Palavras presentes nas listas dos dois idiomas são quase sempre nomes próprios ("jackson")
  // ou cognatos ("hotel") — medem mal o vocabulário, então ficam fora do teste
  const shared = db("words").where("lang", "<>", lang).select("word");
  const bands = [];
  for (const [from, to] of BANDS) {
    const words = await db("words")
      .where({ lang })
      .whereBetween("rank", [from, to])
      .whereNotIn("word", shared)
      .orderByRaw(isSqlite ? "random()" : "rand()")
      .limit(PER_BAND)
      .pluck("word");
    bands.push({ from, to, words });
  }
  res.json({ lang, bands });
});

studyRouter.post("/placement", async (req, res) => {
  const body = z
    .object({ bands: z.array(z.object({ from: z.number(), to: z.number(), shown: z.array(z.string()), known: z.array(z.string()) })) })
    .parse(req.body);
  const { lang } = await langOf(req);
  // Estimativa: cada faixa contribui proporcionalmente ao que a pessoa reconheceu
  const estVocab = Math.round(
    body.bands.reduce((sum, b) => sum + (b.shown.length ? (b.known.length / b.shown.length) * (b.to - b.from + 1) : 0), 0),
  );
  await db("member_languages").where({ member_id: req.member!.id, lang }).update({ est_vocab: estVocab, placement_done: true });
  for (const word of body.bands.flatMap((b) => b.known)) {
    await db("member_words").insert({ member_id: req.member!.id, lang, word, status: "known" }).onConflict(["member_id", "lang", "word"]).merge();
  }
  res.json({ estVocab });
});

studyRouter.post("/words", async (req, res) => {
  const { word, status } = z.object({ word: z.string().trim().toLowerCase().min(1).max(60), status: z.enum(["known", "learning", "unknown"]) }).parse(req.body);
  const { lang } = await langOf(req);
  await db("member_words").insert({ member_id: req.member!.id, lang, word, status }).onConflict(["member_id", "lang", "word"]).merge();
  res.json({ ok: true });
});

// ---------- Cartões (FSRS) ----------

/** Dados de áudio nativo + atribuição (exigida pelas licenças do Tatoeba). */
const audioInfo = (r: { sentence_id: number | null; audio_author?: string; audio_license?: string; audio_attribution?: string | null; tatoeba_id?: number }) =>
  r.sentence_id && r.audio_author
    ? {
        audio: `/api/audio/${r.sentence_id}`,
        credit: { author: r.audio_author, license: r.audio_license, url: r.audio_attribution, sentence: `https://tatoeba.org/sentences/show/${r.tatoeba_id}` },
      }
    : { audio: null, credit: null };

studyRouter.get("/cards/due", async (req, res) => {
  const { lang, phase, estVocab } = await langOf(req);
  // Antes de montar a fila, completa a cota diária de frases nativas novas (i+1)
  await ensureDailyNewCards(req.member!.id, lang, phase, estVocab);
  const rows = await db("cards as c")
    .leftJoin("sentences as s", "s.id", "c.sentence_id")
    .where({ "c.member_id": req.member!.id, "c.lang": lang })
    .andWhere("c.due_at", "<=", new Date().toISOString())
    .orderBy("c.due_at")
    .limit(Number(req.query.limit ?? 50))
    .select("c.*", "s.audio_author", "s.audio_license", "s.audio_attribution", "s.tatoeba_id");
  res.json(
    rows.map((r) => ({
      id: r.id,
      front: r.front,
      back: r.back,
      focus: r.focus,
      source: r.source,
      state: fromJson<{ state: number }>(r.fsrs, { state: 0 }).state,
      intervals: previewIntervals(r.fsrs),
      ...audioInfo(r),
    })),
  );
});

/** Adiciona frases nativas novas além da cota diária ("quero mais"). */
studyRouter.post("/cards/mine", async (req, res) => {
  const { count } = z.object({ count: z.number().int().min(1).max(20).default(5) }).parse(req.body ?? {});
  const { lang, phase, estVocab } = await langOf(req);
  res.json({ added: await mineCards(req.member!.id, lang, phase, estVocab, count) });
});

/** Frases para o shadowing: nativas com áudio (Tatoeba) no nível da fase. */
studyRouter.get("/shadow", async (req, res) => {
  const { lang, phase, estVocab } = await langOf(req);
  const rows = await shadowSentences(req.member!.id, lang, phase, estVocab);
  const meta = await db("sentences").whereIn("id", rows.map((r) => r.id)).select("id", "audio_author", "audio_license", "audio_attribution", "tatoeba_id");
  res.json(
    rows.map((r) => {
      const m = meta.find((x) => x.id === r.id)!;
      return { id: r.id, text: r.text, pt: r.pt, coverage: r.coverage, ...audioInfo({ ...m, sentence_id: r.id }) };
    }),
  );
});

studyRouter.post("/cards/:id/review", async (req, res) => {
  const { rating, elapsedMs } = z.object({ rating: z.number().int().min(1).max(4), elapsedMs: z.number().int().optional() }).parse(req.body);
  const r = await reviewCard(Number(req.params.id), req.member!.id, rating as 1 | 2 | 3 | 4, elapsedMs);
  if (!r) return res.status(404).json({ error: "Cartão não encontrado." });
  // Revisar já é prática do dia, mesmo sem concluir o bloco (vale para sequência e lembrete)
  await setCheckin(req.member!.id, isoDate(), { did_input: true });
  res.json(r);
});

studyRouter.post("/cards", async (req, res) => {
  const body = z.object({ front: z.string().trim().min(1).max(500), back: z.string().trim().max(500), focus: z.string().max(120).optional() }).parse(req.body);
  const { lang } = await langOf(req);
  const id = await addCard({ memberId: req.member!.id, lang, ...body, source: "manual" });
  if (body.focus) {
    await db("member_words").insert({ member_id: req.member!.id, lang, word: body.focus.toLowerCase(), status: "learning" }).onConflict(["member_id", "lang", "word"]).merge();
  }
  res.status(id ? 201 : 200).json({ id, duplicate: !id });
});

studyRouter.get("/cards/stats", async (req, res) => {
  const { lang } = await langOf(req);
  const total = await db("cards").where({ member_id: req.member!.id, lang }).count({ n: "*" }).first();
  const reviews = await db("review_logs as r")
    .join("cards as c", "c.id", "r.card_id")
    .where({ "c.member_id": req.member!.id, "c.lang": lang })
    .andWhere("r.reviewed_at", ">=", new Date(Date.now() - 30 * 86400000).toISOString())
    .select("r.rating");
  const good = reviews.filter((r) => r.rating >= 3).length;
  res.json({ total: Number(total?.n ?? 0), reviews30d: reviews.length, retention: reviews.length ? good / reviews.length : null });
});
