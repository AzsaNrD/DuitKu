import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL!;
const isPglite = url.startsWith("file:");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(isPglite ? { driver: "pglite" } : {}),
  dbCredentials: {
    url: isPglite ? url.slice(5) : url,
  },
});
