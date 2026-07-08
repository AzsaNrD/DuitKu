import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Ambil user id dari session; redirect ke /login jika belum login.
// Dipakai di setiap server action & page terproteksi supaya
// semua query selalu ter-scope ke user yang sedang login.
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}
