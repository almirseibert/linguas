import knexFactory, { type Knex } from "knex";

const client = process.env.DB_CLIENT ?? "sqlite";

export const isSqlite = client === "sqlite";

const config: Knex.Config = isSqlite
  ? {
      client: "better-sqlite3",
      connection: { filename: process.env.SQLITE_FILE ?? "./dev.sqlite" },
      useNullAsDefault: true,
    }
  : {
      client: "mysql2",
      connection: process.env.DATABASE_URL,
      pool: { min: 0, max: 10 },
    };

export const db = knexFactory(config);

/** Colunas JSON ficam como texto para funcionar igual em SQLite e MySQL. */
export const toJson = (v: unknown) => JSON.stringify(v ?? null);

export function fromJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v !== "string") return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

/** Id do registro inserido (SQLite e MySQL devolvem número). */
export async function insertId(q: Promise<unknown[]>): Promise<number> {
  const first = ((await q) as Array<number | { id: number }>)[0];
  return typeof first === "number" ? first : first.id;
}

/** SQLite devolve 0/1 para booleanos. */
export const bool = (v: unknown) => v === true || v === 1 || v === "1";
