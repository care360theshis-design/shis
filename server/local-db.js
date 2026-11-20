import { mkdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const dataDir = new URL("../data/shis", import.meta.url).pathname;

export async function startLocalDb() {
  mkdirSync(dataDir, { recursive: true });
  const db = new PGlite(dataDir);
  await db.waitReady;
  const existing = await db.query("select to_regclass('public.students') as name");
  if (!existing.rows[0]?.name) {
    await db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    await db.exec(readFileSync(new URL("./seed.sql", import.meta.url), "utf8"));
  }
  await db.exec(readFileSync(new URL("./wider.sql", import.meta.url), "utf8"));
  console.log("[shis-db] local Postgres ready");
  return db;
}
