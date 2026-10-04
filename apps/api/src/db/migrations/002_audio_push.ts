import type { Knex } from "knex";

export async function up(k: Knex) {
  // Frases nativas do Tatoeba com áudio gravado por falantes (CC BY 2.0 FR; áudio com licença própria)
  await k.schema.createTable("sentences", (t) => {
    t.increments("id");
    t.string("lang", 8).notNullable();
    t.text("text").notNullable();
    t.text("pt").notNullable();
    t.integer("word_count").notNullable();
    t.integer("tatoeba_id").notNullable();
    t.string("owner", 40).nullable();
    t.string("audio_url", 200).notNullable();
    t.string("audio_author", 40).notNullable();
    t.string("audio_license", 40).notNullable();
    t.string("audio_attribution", 200).nullable();
    t.unique(["lang", "tatoeba_id"]);
    t.index(["lang", "word_count"]);
  });

  await k.schema.alterTable("cards", (t) => {
    t.integer("sentence_id").unsigned().nullable().references("sentences.id").onDelete("SET NULL");
  });

  await k.schema.alterTable("push_subscriptions", (t) => {
    t.string("last_sent", 10).nullable(); // data do último lembrete enviado
    t.timestamp("created_at").defaultTo(k.fn.now());
  });

  // Configurações geradas pelo próprio app (ex.: chaves VAPID quando não vêm do .env)
  await k.schema.createTable("app_settings", (t) => {
    t.string("key", 60).primary();
    t.text("value").notNullable();
  });
}

export async function down(k: Knex) {
  await k.schema.dropTableIfExists("app_settings");
  await k.schema.alterTable("push_subscriptions", (t) => {
    t.dropColumn("last_sent");
    t.dropColumn("created_at");
  });
  await k.schema.alterTable("cards", (t) => {
    t.dropForeign(["sentence_id"]);
    t.dropColumn("sentence_id");
  });
  await k.schema.dropTableIfExists("sentences");
}
