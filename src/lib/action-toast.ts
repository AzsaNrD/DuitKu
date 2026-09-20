import { toast } from "sonner";

// Bentuk hasil yang seragam dipakai server action maupun fungsi guest-store
// (mode tanpa akun), supaya keduanya bisa dipakai bergantian oleh komponen
// yang sama lewat actionToast.
export type ActionResult = { error?: string } | { success: boolean };

// Jalankan server action di latar dengan toast loading → sukses/gagal.
// Dipanggil SETELAH dialog ditutup supaya UI terasa instan;
// kalau server menolak, user tetap diberi tahu lewat toast error.
export function actionToast(
  promise: Promise<ActionResult>,
  messages: { loading: string; success: string }
) {
  toast.promise(
    promise.then((res) => {
      if (res && "error" in res && res.error) throw new Error(res.error);
    }),
    {
      loading: messages.loading,
      success: messages.success,
      error: (e: Error) => e.message || "Terjadi kesalahan, coba lagi",
    }
  );
}
