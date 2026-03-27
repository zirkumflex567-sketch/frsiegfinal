import { Pool } from "pg";

const globalForDb = globalThis as unknown as {
  pool?: Pool;
};

export function getDbPool(): Pool {
  if (globalForDb.pool) {
    return globalForDb.pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.pool = pool;
  }

  return pool;
}
