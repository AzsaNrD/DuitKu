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

// Hapus dengan tombol "Urungkan": hasil hapus membawa snapshot isi yang
// dihapus, dan toast sukses menawarkan memulihkannya selama beberapa detik.
// Tidak ada dialog konfirmasi, jadi salah tekan cukup diurungkan.
export function undoableToast<S>(
  promise: Promise<ActionResult & { snapshot?: S }>,
  restore: (snapshot: S) => Promise<ActionResult>,
  messages: { loading: string; success: string; restored: string }
) {
  const id = toast.loading(messages.loading);
  promise
    .then((res) => {
      if (res && "error" in res && res.error) throw new Error(res.error);
      const snapshot = res.snapshot;
      toast.success(messages.success, {
        id,
        duration: 8000,
        action: snapshot
          ? {
              label: "Urungkan",
              onClick: () =>
                actionToast(restore(snapshot), {
                  loading: "Memulihkan...",
                  success: messages.restored,
                }),
            }
          : undefined,
      });
    })
    .catch((e: Error) =>
      toast.error(e.message || "Terjadi kesalahan, coba lagi", { id })
    );
}
