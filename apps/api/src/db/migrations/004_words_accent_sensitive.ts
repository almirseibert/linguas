import type { Knex } from "knex";

const isMysql = (k: Knex) => String(k.client.config.client).startsWith("mysql");

/**
 * No MySQL, a collation padrão (utf8mb4_0900_ai_ci) ignora acentos: "si" = "sí", "el" = "él",
 * "yöu" = "you". Para vocabulário isso é errado (são palavras diferentes) e quebrava a
 * importação com "Duplicate entry". As colunas de palavra passam a comparar byte a byte.
 * No SQLite a comparação já diferencia acentos, então não há o que fazer.
 */
export async function up(k: Knex) {
  if (!isMysql(k)) return;
  await k.raw("ALTER TABLE `words` MODIFY `word` VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL");
  await k.raw("ALTER TABLE `member_words` MODIFY `word` VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL");
}

export async function down(k: Knex) {
  if (!isMysql(k)) return;
  await k.raw("ALTER TABLE `words` MODIFY `word` VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL");
  await k.raw("ALTER TABLE `member_words` MODIFY `word` VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL");
}
