import { LANG_CODES } from "@passaporte/shared";
import { CONTENT, PHASES } from "./content.ts";
import { db } from "./knex.ts";

// Recria só o conteúdo pedagógico; nunca toca em famílias, membros ou progresso.
await db.transaction(async (trx) => {
  await trx("phases").del();
  await trx("content_items").del();
  await trx("resources").del();

  for (const lang of LANG_CODES) {
    await trx("phases").insert(PHASES.map((p) => ({ ...p, lang })));

    const c = CONTENT[lang];
    for (const [phase, pairs] of Object.entries(c.phrases)) {
      await trx("content_items").insert(
        pairs.map(([content, content_pt]) => ({ lang, phase: Number(phase), type: "phrase", content, content_pt })),
      );
    }
    for (const [phase, texts] of Object.entries(c.texts)) {
      await trx("content_items").insert(
        texts.map((t) => ({ lang, phase: Number(phase), type: "text", category: t.title, content: t.body, content_pt: t.pt })),
      );
    }
    await trx("resources").insert(c.resources.map((r, order) => ({ ...r, lang, order })));
  }
});

const counts = await db("content_items").select("lang").count({ n: "*" }).groupBy("lang");
console.log("Conteúdo carregado:", counts);
await db.destroy();
