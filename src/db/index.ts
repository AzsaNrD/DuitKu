import { neon } from "@neondatabase/serverless";
import {
  drizzle as drizzleNeon,
  NeonHttpDatabase,
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
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL belum di-set. Isi di .env.local (lokal) atau Environment Variables (Vercel)."
    );
  }
  if (url.startsWith("file:")) {
    return drizzlePglite(url.slice(5), { schema }) as unknown as Db;
  }
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    return drizzlePg(url, { schema }) as unknown as Db;
  }
  return drizzleNeon(neon(url), { schema });
}

// Singleton yang dibuat LAZY (saat query pertama, bukan saat modul di-import)
// supaya `next build` tidak butuh DATABASE_URL, dan hot-reload di dev tidak
// membuka koneksi/instance PGlite ganda.
const g = globalThis as typeof globalThis & { __duitkuDb?: Db };

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = (g.__duitkuDb ??= createDb());
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
  // DrizzleAdapter mendeteksi jenis database lewat `instanceof` —
  // jawab dari prototype-nya saja, tanpa membuka koneksi
  getPrototypeOf() {
    return NeonHttpDatabase.prototype;
  },
});
