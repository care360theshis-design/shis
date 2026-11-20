import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() || "";

export const databaseConfigured = databaseUrl.length > 0;

let pool;
let localDb = null;

export function setLocalDb(db) {
  localDb = db;
}

export function getPool() {
  if (localDb || !databaseConfigured) return null;
  if (!pool) {
    const supabase = databaseUrl.includes("supabase.co") || databaseUrl.includes("supabase.com");
    pool = new pg.Pool({
      connectionString: databaseUrl,
      max: Number(process.env.PG_POOL_MAX) || 10,
      ssl: supabase ? { rejectUnauthorized: false } : undefined,
    });
    pool.on("error", (error) => {
      console.error("[shis-db] pool error", error.message);
    });
  }
  return pool;
}

export async function query(text, params = []) {
  if (localDb) return localDb.query(text, params);
  const active = getPool();
  if (!active) {
    const error = new Error("DATABASE_URL is not set");
    error.status = 503;
    throw error;
  }
  return active.query(text, params);
}
