import type { Knex } from "knex";

export async function up(k: Knex) {
  await k.schema.alterTable("cards", (t) => {
    t.string("added_on", 10).nullable(); // data local em que o cartão entrou (cota diária de frases novas)
    t.index(["member_id", "lang", "added_on"]);
  });
}

export async function down(k: Knex) {
  await k.schema.alterTable("cards", (t) => {
    t.dropIndex(["member_id", "lang", "added_on"]);
    t.dropColumn("added_on");
  });
}
