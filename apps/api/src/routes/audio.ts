import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { db } from "../db/knex.ts";

/**
 * Áudio nativo das frases do Tatoeba, com cache em disco:
 * cada arquivo é baixado do Tatoeba uma única vez e depois servido daqui.
 */
export const audioRouter = Router();

const CACHE_DIR = path.resolve(process.env.AUDIO_CACHE_DIR ?? "./audio-cache");
const inflight = new Map<string, Promise<Buffer>>();

async function fetchAudio(url: string, file: string): Promise<Buffer> {
  try {
    return await fs.readFile(file);
  } catch {
    // não está no cache: baixa
  }
  const res = await fetch(url, { headers: { "User-Agent": "passaporte-idiomas (projeto familiar)" } });
  if (!res.ok || !res.headers.get("content-type")?.startsWith("audio/")) throw new Error(`Tatoeba respondeu ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buf);
  return buf;
}

audioRouter.get("/:sentenceId", async (req, res) => {
  const s = await db("sentences").where({ id: Number(req.params.sentenceId) }).first("lang", "audio_url");
  if (!s) return res.status(404).end();
  const audioId = /(\d+)(?:\/file)?$/.exec(s.audio_url)?.[1] ?? req.params.sentenceId;
  const file = path.join(CACHE_DIR, s.lang, `${audioId}.mp3`);

  let pending = inflight.get(file);
  if (!pending) {
    pending = fetchAudio(s.audio_url, file).finally(() => inflight.delete(file));
    inflight.set(file, pending);
  }
  try {
    const buf = await pending;
    res.set({ "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=31536000, immutable" }).send(buf);
  } catch (err) {
    console.error("Falha ao obter áudio:", err);
    res.status(502).end();
  }
});
