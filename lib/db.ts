import { Pool, types } from "pg";

// node-postgres returns int8/bigint as a string to avoid precision loss. Our
// timestamps are epoch millis (~1.8e12), far below Number.MAX_SAFE_INTEGER, and
// the whole app treats them as numbers — storage.ts casts rows with `as number`,
// which is compile-time only and would leave strings at runtime. Parse here so
// date math and `publishedAt !== null` checks behave.
types.setTypeParser(20, (value: string) => parseInt(value, 10));

// Direct Postgres access, bypassing PostgREST (/rest/v1). The REST layer can
// go down independently of the database — when it does, every table returns a
// 503 from the edge proxy while Postgres itself is perfectly healthy. Talking
// to the pooler keeps the site readable through that failure mode.
//
// Server-only: DATABASE_URL is not NEXT_PUBLIC_, so it never ships to the
// browser. Everything here runs inside app/api routes.

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add the Supabase pooler connection string to .env.local.",
    );
  }

  // Reuse across hot reloads in dev; without the global, every recompile
  // leaks a pool and we exhaust the 60-connection ceiling.
  globalThis._pgPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase's pooler terminates TLS with a cert this chain doesn't verify.
    ssl: { rejectUnauthorized: false },
    // The pooler runs in transaction mode and is shared with any other client;
    // stay well under max_client_conn.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return globalThis._pgPool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}
