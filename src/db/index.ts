import { neon } from "@neondatabase/serverless";
import {
  drizzle as drizzleNeon,
  type NeonHttpDatabase,
} from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

// Tiga mode koneksi berdasarkan DATABASE_URL:
// - "file:..."            -> PGlite (Postgres embedded, tanpa install apa pun)
// - host localhost/127.*  -> node-postgres (Postgres lokal biasa)
// - selain itu            -> Neon serverless (produksi)
type Db = NeonHttpDatabase<typeof schema>;

function createDb(): Db {
  const url = process.env.DATABASE_URL!;
  if (url.startsWith("file:")) {
    return drizzlePglite(url.slice(5), { schema }) as unknown as Db;
  }
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    return drizzlePg(url, { schema }) as unknown as Db;
  }
  return drizzleNeon(neon(url), { schema });
}

// Singleton via globalThis supaya hot-reload di dev tidak
// membuka koneksi/instance PGlite ganda.
const g = globalThis as typeof globalThis & { __duitkuDb?: Db };
export const db = (g.__duitkuDb ??= createDb());
