import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  users,
  authAccounts,
  sessions,
  verificationTokens,
} from "@/db/schema";
import { loginSchema } from "@/lib/zod-schemas";
import { seedDefaultCategories } from "@/lib/seed-categories";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

// Error khusus saat percobaan login melebihi batas — `code`-nya
// dibaca form login untuk menampilkan pesan yang tepat.
class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: authAccounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  // percayai host dari header request (aman di balik Vercel/proxy;
  // tanpa ini, build produksi self-host menolak semua request auth)
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials, request) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // batasi percobaan: 5/15 menit per email, 20/15 menit per IP
        const ip = clientIp(request.headers);
        const [limitedByEmail, limitedByIp] = await Promise.all([
          isRateLimited(`login:email:${email.toLowerCase()}`, 5, 15 * 60),
          isRateLimited(`login:ip:${ip}`, 20, 15 * 60),
        ]);
        if (limitedByEmail || limitedByIp) throw new RateLimitedError();

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });
        if (!user?.hashedPassword) return null;

        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  events: {
    // seed kategori bawaan untuk user baru (register via Google)
    createUser: async ({ user }) => {
      if (user.id) await seedDefaultCategories(user.id);
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
