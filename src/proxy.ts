import NextAuth from "next-auth";

// Proxy (pengganti middleware di Next.js 16) memakai konfigurasi NextAuth
// terpisah tanpa adapter/bcrypt agar ringan dan tidak menyentuh DB.
const { auth } = NextAuth({
  providers: [],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ auth, request }) => {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isAuthPage = pathname === "/login" || pathname === "/register";

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }
      return isLoggedIn;
    },
  },
});

export default auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/recurring/:path*",
    "/wallets/:path*",
    "/categories/:path*",
    "/budgets/:path*",
    "/goals/:path*",
    "/reports/:path*",
    "/login",
    "/register",
  ],
};
