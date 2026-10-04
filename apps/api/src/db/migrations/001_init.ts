import type { Knex } from "knex";

export async function up(k: Knex) {
  await k.schema.createTable("families", (t) => {
    t.increments("id");
    t.string("name", 120).notNullable();
    t.string("invite_code", 16).notNullable().unique();
    t.string("ai_provider", 16).notNullable().defaultTo("claude");
    t.timestamp("created_at").defaultTo(k.fn.now());
  });

  await k.schema.createTable("members", (t) => {
    t.increments("id");
    t.integer("family_id").unsigned().notNullable().references("families.id").onDelete("CASCADE");
    t.string("name", 80).notNullable();
    t.string("avatar_color", 16).notNullable().defaultTo("#2F6F4E");
    t.string("pin_hash", 200).notNullable();
    t.string("active_lang", 8).notNullable().defaultTo("en");
    t.string("ai_provider", 16).nullable(); // sobrescreve o da família
    t.timestamp("created_at").defaultTo(k.fn.now());
    t.unique(["family_id", "name"]);
  });

  // Cada membro estuda um ou mais idiomas, cada um com sua fase e nível
  await k.schema.createTable("member_languages", (t) => {
    t.increments("id");
    t.integer("member_id").unsigned().notNullable().references("members.id").onDelete("CASCADE");
    t.string("lang", 8).notNullable();
    t.integer("phase").notNullable().defaultTo(1);
    t.integer("est_vocab").notNullable().defaultTo(0);
    t.boolean("placement_done").notNullable().defaultTo(false);
    t.string("phase_started", 10).nullable(); // data em que entrou na fase atual
    t.timestamp("created_at").defaultTo(k.fn.now());
    t.unique(["member_id", "lang"]);
  });

  await k.schema.createTable("checkins", (t) => {
    t.increments("id");
    t.integer("member_id").unsigned().notNullable().references("members.id").onDelete("CASCADE");
    t.string("date", 10).notNullable();
    t.boolean("did_input").notNullable().defaultTo(false);
    t.boolean("did_speak").notNullable().defaultTo(false);
    t.boolean("did_family").notNullable().defaultTo(false);
    t.timestamp("created_at").defaultTo(k.fn.now());
    t.unique(["member_id", "date"]);
  });

  await k.schema.createTable("family_log", (t) => {
    t.increments("id");
    t.integer("family_id").unsigned().notNullable().references("families.id").onDelete("CASCADE");
    t.integer("member_id").unsigned().notNullable().references("members.id").onDelete("CASCADE");
    t.string("lang", 8).nullable();
    t.text("note").notNullable();
    t.string("date", 10).notNullable();
    t.timestamp("created_at").defaultTo(k.fn.now());
  });

  await k.schema.createTable("phases", (t) => {
    t.increments("id");
    t.string("lang", 8).notNullable();
    t.integer("order").notNullable();
    t.string("name", 60).notNullable();
    t.text("description").notNullable();
    t.integer("week_start").notNullable();
    t.integer("week_end").nullable();
    t.unique(["lang", "order"]);
  });

  await k.schema.createTable("content_items", (t) => {
    t.increments("id");
    t.string("lang", 8).notNullable();
    t.integer("phase").notNullable();
    t.string("type", 16).notNullable(); // phrase | text
    t.string("category", 60).nullable();
    t.text("content").notNullable(); // no idioma estudado
    t.text("content_pt").nullable();
    t.index(["lang", "phase", "type"]);
  });

  await k.schema.createTable("resources", (t) => {
    t.increments("id");
    t.string("lang", 8).notNullable();
    t.string("category", 60).notNullable();
    t.string("name", 120).notNullable();
    t.string("url", 300).notNullable();
    t.text("description").nullable();
    t.integer("order").notNullable().defaultTo(0);
  });

  // Lista de frequência por idioma (FrequencyWords / OpenSubtitles, CC BY-SA 4.0)
  await k.schema.createTable("words", (t) => {
    t.increments("id");
    t.string("lang", 8).notNullable();
    t.string("word", 60).notNullable();
    t.integer("rank").notNullable();
    t.unique(["lang", "word"]);
    t.index(["lang", "rank"]);
  });

  await k.schema.createTable("member_words", (t) => {
    t.integer("member_id").unsigned().notNullable().references("members.id").onDelete("CASCADE");
    t.string("lang", 8).notNullable();
    t.string("word", 60).notNullable();
    t.string("status", 12).notNullable(); // known | learning | unknown
    t.primary(["member_id", "lang", "word"]);
  });

  // Cartões de repetição espaçada (FSRS) — sempre frases, nunca palavras soltas
  await k.schema.createTable("cards", (t) => {
    t.increments("id");
    t.integer("member_id").unsigned().notNullable().references("members.id").onDelete("CASCADE");
    t.string("lang", 8).notNullable();
    t.text("front").notNullable(); // frase no idioma estudado
    t.text("back").notNullable(); // tradução / explicação em português
    t.string("focus", 120).nullable(); // palavra ou estrutura em destaque
    t.string("source", 16).notNullable(); // seed | reading | talk | manual
    t.text("fsrs").notNullable(); // JSON do Card do ts-fsrs
    t.string("due_at", 30).notNullable(); // ISO 8601
    t.timestamp("created_at").defaultTo(k.fn.now());
    t.index(["member_id", "lang", "due_at"]);
  });

  await k.schema.createTable("review_logs", (t) => {
    t.increments("id");
    t.integer("card_id").unsigned().notNullable().references("cards.id").onDelete("CASCADE");
    t.integer("rating").notNullable();
    t.string("reviewed_at", 30).notNullable();
    t.integer("elapsed_ms").nullable();
  });

  // Sessão diária guiada: um registro por bloco concluído
  await k.schema.createTable("session_blocks", (t) => {
    t.increments("id");
    t.integer("member_id").unsigned().notNullable().references("members.id").onDelete("CASCADE");
    t.string("lang", 8).notNullable();
    t.string("date", 10).notNullable();
    t.string("block", 16).notNullable(); // review | input | shadow | talk
    t.integer("minutes").notNullable().defaultTo(0);
    t.timestamp("created_at").defaultTo(k.fn.now());
    t.unique(["member_id", "lang", "date", "block"]);
  });

  await k.schema.createTable("conversations", (t) => {
    t.increments("id");
    t.integer("member_id").unsigned().notNullable().references("members.id").onDelete("CASCADE");
    t.string("lang", 8).notNullable();
    t.string("topic", 200).notNullable();
    t.string("provider", 16).notNullable();
    t.timestamp("created_at").defaultTo(k.fn.now());
  });

  await k.schema.createTable("messages", (t) => {
    t.increments("id");
    t.integer("conversation_id").unsigned().notNullable().references("conversations.id").onDelete("CASCADE");
    t.string("role", 12).notNullable(); // user | assistant
    t.text("text").notNullable();
    t.text("corrections").nullable(); // JSON
    t.timestamp("created_at").defaultTo(k.fn.now());
  });

  await k.schema.createTable("ai_usage", (t) => {
    t.integer("member_id").unsigned().notNullable().references("members.id").onDelete("CASCADE");
    t.string("date", 10).notNullable();
    t.integer("calls").notNullable().defaultTo(0);
    t.primary(["member_id", "date"]);
  });

  await k.schema.createTable("push_subscriptions", (t) => {
    t.increments("id");
    t.integer("member_id").unsigned().notNullable().references("members.id").onDelete("CASCADE");
    t.text("endpoint").notNullable();
    t.text("keys").notNullable();
    t.string("remind_at", 5).notNullable().defaultTo("19:00");
  });
}

export async function down(k: Knex) {
  for (const t of [
    "push_subscriptions", "ai_usage", "messages", "conversations", "session_blocks", "review_logs",
    "cards", "member_words", "words", "resources", "content_items", "phases", "family_log",
    "checkins", "member_languages", "members", "families",
  ]) await k.schema.dropTableIfExists(t);
}
