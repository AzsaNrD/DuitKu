"use server";

import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { registerSchema, type RegisterInput } from "@/lib/zod-schemas";
import { seedDefaultCategories } from "@/lib/seed-categories";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

export async function registerUser(input: RegisterInput) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  // batasi pendaftaran: 5 per jam per IP
  const ip = clientIp(await headers());
  if (await isRateLimited(`register:ip:${ip}`, 5, 3600)) {
    return {
      error: "Terlalu banyak percobaan daftar. Coba lagi dalam satu jam.",
    };
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });
  if (existing) {
    return { error: "Email sudah terdaftar" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ name, email: normalizedEmail, hashedPassword })
    .returning({ id: users.id });

  await seedDefaultCategories(user.id);

  return { success: true };
}
