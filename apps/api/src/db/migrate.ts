import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./knex.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

const [batch, log] = await db.migrate.latest({
  directory: path.join(here, "migrations"),
  loadExtensions: [".ts"],
});
console.log(log.length ? `Migração ${batch}: ${log.join(", ")}` : "Banco já está atualizado.");
await db.destroy();
