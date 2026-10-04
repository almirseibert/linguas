/**
 * Importa frases nativas do Tatoeba (https://tatoeba.org) com áudio gravado por falantes
 * e tradução para o português, via API pública v1.
 *
 * - Texto das frases: CC BY 2.0 FR.
 * - Áudio: cada gravação tem licença própria; só entram as que têm licença de reuso
 *   explícita (CC BY, CC BY-NC, CC0…). Autor e link de atribuição ficam guardados.
 * - Espanhol: só áudios de quem declara no perfil a variante da Espanha.
 *
 * Uso: npm run import:sentences            (padrão: 1500 frases por idioma)
 *      npm run import:sentences -- 3000
 */
import { LANG_CODES, tokenize, type LangCode } from "@passaporte/shared";
import { db } from "./knex.ts";

const API = "https://api.tatoeba.org";
const TARGET = Number(process.argv[2] ?? 1500);
const TATOEBA_LANG: Record<LangCode, string> = { en: "eng", es: "spa" };
// Faixas de tamanho: frases curtas para a Fase 1, mais longas para as seguintes
const BANDS = ["3-5", "6-8", "9-12"];

interface Audio {
  id: number;
  author: string;
  license: string | null;
  attribution_url: string | null;
  download_url: string;
}
interface Sentence {
  id: number;
  text: string;
  lang: string;
  owner: string | null;
  audios?: Audio[];
  translations?: (Sentence & { is_direct: boolean })[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "passaporte-idiomas (projeto familiar)" } });
    if (res.ok) return (await res.json()) as T;
    if (attempt >= 3 || res.status < 500) throw new Error(`Tatoeba HTTP ${res.status}: ${url}`);
    await sleep(2000 * (attempt + 1));
  }
}

const SPAIN = /espa(ñ|n)a|spain|castell|castilian|peninsular|madrid|barcelona|valencia|sevilla|andaluc|galicia|catalu|asturias|arag(o|ó)n|murcia|bilbao|euskadi|canarias/i;
const userCache = new Map<string, boolean>();

/** O autor do áudio declara espanhol da Espanha no perfil? */
async function isSpainSpeaker(username: string): Promise<boolean> {
  if (userCache.has(username)) return userCache.get(username)!;
  let ok = false;
  try {
    const { data } = await getJson<{ data: { languages: { code: string; details: string | null }[] } }>(
      `${API}/unstable/users/${encodeURIComponent(username)}`,
    );
    ok = data.languages.some((l) => l.code === "spa" && SPAIN.test(l.details ?? ""));
  } catch {
    ok = false;
  }
  userCache.set(username, ok);
  return ok;
}

const reusable = (license: string | null) => Boolean(license && license !== "PROBLEM");

async function importLang(lang: LangCode) {
  const tlang = TATOEBA_LANG[lang];
  const existing = new Set<number>(await db("sentences").where({ lang }).pluck("tatoeba_id"));
  let added = 0;

  for (const band of BANDS) {
    const bandTarget = Math.ceil(TARGET / BANDS.length);
    let bandAdded = 0;
    let url: string | null =
      `${API}/v1/sentences?lang=${tlang}&has_audio=yes&trans:lang=por&word_count=${band}` +
      `&is_unapproved=no&sort=random&limit=100&include=audios`;

    for (let page = 0; url && bandAdded < bandTarget && page < 60; page++) {
      const body: { data: Sentence[]; paging: { next?: string; has_next: boolean } } = await getJson(url);
      const rows = [];
      for (const s of body.data) {
        if (existing.has(s.id)) continue;
        const pt = s.translations?.filter((t) => t.lang === "por").sort((a, b) => Number(b.is_direct) - Number(a.is_direct))[0];
        if (!pt) continue;
        let audio: Audio | undefined;
        for (const a of s.audios ?? []) {
          if (!reusable(a.license)) continue;
          if (lang === "es" && !(await isSpainSpeaker(a.author))) continue;
          audio = a;
          break;
        }
        if (!audio) continue;
        existing.add(s.id);
        rows.push({
          lang,
          text: s.text,
          pt: pt.text,
          word_count: tokenize(s.text).length,
          tatoeba_id: s.id,
          owner: s.owner,
          // o download_url da API v1 responde 404; o endereço público do site funciona
          audio_url: `https://tatoeba.org/audio/download/${audio.id}`,
          audio_author: audio.author,
          audio_license: audio.license!,
          audio_attribution: audio.attribution_url,
        });
      }
      if (rows.length) await db("sentences").insert(rows);
      bandAdded += rows.length;
      url = body.paging.has_next ? (body.paging.next ?? null) : null;
      await sleep(400); // gentileza com o servidor do Tatoeba
    }
    console.log(`  ${lang} ${band} palavras: +${bandAdded}`);
    added += bandAdded;
  }

  if (lang === "es") {
    const spain = [...userCache].filter(([, ok]) => ok).map(([u]) => u);
    console.log(`  vozes da Espanha encontradas: ${spain.join(", ") || "nenhuma"}`);
  }
  return added;
}

// Corrige endereços de áudio de importações antigas (download_url da API v1, que responde 404)
const legacy = await db("sentences").where("audio_url", "like", "%api.tatoeba.org%").select("id", "audio_url");
for (const row of legacy) {
  const id = /audio\/(\d+)\/file/.exec(row.audio_url)?.[1];
  if (id) await db("sentences").where({ id: row.id }).update({ audio_url: `https://tatoeba.org/audio/download/${id}` });
}
if (legacy.length) console.log(`${legacy.length} endereços de áudio corrigidos`);

for (const lang of LANG_CODES) {
  console.log(`Importando ${lang}…`);
  console.log(`${lang}: ${await importLang(lang)} frases novas`);
}
await db.destroy();
