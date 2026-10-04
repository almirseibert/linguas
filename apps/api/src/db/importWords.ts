/**
 * Importa listas de frequência do projeto FrequencyWords (hermitdave/FrequencyWords),
 * geradas a partir de legendas do OpenSubtitles 2018 — licença CC BY-SA 4.0.
 * Legendas = língua falada do dia a dia, exatamente o objetivo do app.
 */
import { LANG_CODES, type LangCode } from "@passaporte/shared";
import { db } from "./knex.ts";

const LIMIT = 5000;
const url = (lang: LangCode) =>
  `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${lang}/${lang}_50k.txt`;

// Só letras (com acentos), sem números, sem lixo de legenda
const VALID = /^\p{L}+(?:'\p{L}+)?$/u;

for (const lang of LANG_CODES) {
  const res = await fetch(url(lang));
  if (!res.ok) throw new Error(`Falha ao baixar lista ${lang}: HTTP ${res.status}`);
  const lines = (await res.text()).split("\n");

  const rows: { lang: string; word: string; rank: number }[] = [];
  for (const line of lines) {
    const word = line.split(" ")[0]?.trim().toLowerCase();
    if (!word || !VALID.test(word) || word.length > 60) continue;
    rows.push({ lang, word, rank: rows.length + 1 });
    if (rows.length >= LIMIT) break;
  }

  await db.transaction(async (trx) => {
    await trx("words").where({ lang }).del();
    for (let i = 0; i < rows.length; i += 500) await trx("words").insert(rows.slice(i, i + 500));
  });
  console.log(`${lang}: ${rows.length} palavras importadas`);
}

await db.destroy();
