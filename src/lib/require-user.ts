import { cache } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Satu pembacaan session per request: layout dan page memanggil ini
// bersamaan, dan cache() membuat panggilan kedua tidak mengulang kerja.
export const getSession = cache(() => auth());

// Ambil user id dari session; redirect ke /login jika belum login.
// Dipakai di setiap server action & page terproteksi supaya
// semua query selalu ter-scope ke user yang sedang login.
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}
