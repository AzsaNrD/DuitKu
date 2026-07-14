import { toast } from "sonner";

// Jalankan server action di latar dengan toast loading → sukses/gagal.
// Dipanggil SETELAH dialog ditutup supaya UI terasa instan;
// kalau server menolak, user tetap diberi tahu lewat toast error.
export function actionToast(
  promise: Promise<{ error?: string } | { success: boolean }>,
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
