import "server-only";

/**
 * Database driver selection.
 *
 * ARCHITECTURE.md specifies PostgreSQL + pgvector as the store. The schema in
 * `./schema.ts` is authoritative and migrations generate from it. At runtime
 * the repositories choose a driver:
 *
 *   DATABASE_URL set   -> Postgres via drizzle/postgres.js
 *   DATABASE_URL unset -> the seeded in-memory corpus (`./seed`)
 *
 * The in-memory driver exists so the golden demo path runs on a laptop with
 * no database provisioned. It reads the same fixtures the Postgres seeder
 * loads, and every repository is written against the same interface, so
 * nothing downstream knows which driver is active.
 */

export type DriverKind = "postgres" | "memory";

export function driverKind(): DriverKind {
  return process.env.DATABASE_URL ? "postgres" : "memory";
}

export function isPostgres(): boolean {
  return driverKind() === "postgres";
}

/**
 * Lazily-created Postgres handle. Imported dynamically so that `postgres`
 * and `drizzle-orm` are never pulled into a build that runs on the
 * in-memory driver.
 */
type DrizzleDb = Awaited<ReturnType<typeof createDb>>;

async function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  const [{ drizzle }, postgres, schema] = await Promise.all([
    import("drizzle-orm/postgres-js"),
    import("postgres").then((m) => m.default),
    import("./schema"),
  ]);
  const client = postgres(url, { max: 8, idle_timeout: 20 });
  return drizzle(client, { schema });
}

let dbPromise: Promise<DrizzleDb> | undefined;

export function getDb(): Promise<DrizzleDb> {
  if (!dbPromise) dbPromise = createDb();
  return dbPromise;
}
