import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __rdAgentSql: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.");
}

const sql =
  global.__rdAgentSql ??
  postgres(connectionString, {
    prepare: false,
    max: 5,
    // Recycle connections proactively — without this, a pooled connection that's gone stale
    // during a long-idle dev session (or a pooler-side idle disconnect) sits in the pool
    // looking alive until a query hits it and hangs until Postgres's own statement_timeout.
    idle_timeout: 20,
    max_lifetime: 30 * 60,
  });

if (process.env.NODE_ENV !== "production") {
  global.__rdAgentSql = sql;
}

export const db = drizzle(sql, { schema });
