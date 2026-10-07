"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Check, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Event online/offline dikirim browser begitu sistem operasi melaporkan
// jaringan putus (wifi dimatikan, mode pesawat), jadi kartu muncul tanpa
// polling. Batasannya: wifi yang tersambung tapi tidak ada internet tetap
// dianggap online oleh browser.
function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

const BACK_ONLINE_MS = 2500;
// sama dengan durasi animasi tilt-away di globals.css
const LEAVE_MS = 320;

// Isi pesan menyesuaikan apa yang benar-benar terjadi di tiap area:
// mode tanpa akun menyimpan ke browser jadi tetap jalan, sedangkan akun
// asli butuh server untuk menyimpan.
function offlineHint(pathname: string) {
  if (pathname.startsWith("/guest")) {
    return "Catatanmu tetap tersimpan di browser ini, tapi pindah halaman bisa gagal sampai tersambung lagi.";
  }
  if (pathname === "/" || pathname === "/login" || pathname === "/register") {
    return "Masuk, daftar, dan pindah halaman belum bisa sampai tersambung lagi.";
  }
  return "Catatan baru belum bisa disimpan sampai tersambung lagi. Data yang sudah tampil tetap bisa dilihat.";
}

export function ConnectionStatus() {
  const pathname = usePathname();
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  );
  // back: kartu sudah dibalik ke sisi "Kembali online";
  // leaving: kartu sedang rebah sebelum dilepas dari DOM
  const [phase, setPhase] = useState<"idle" | "back" | "leaving">("idle");

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    const clear = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const onOnline = () => {
      clear();
      setPhase("back");
      timers.push(
        setTimeout(() => setPhase("leaving"), BACK_ONLINE_MS),
        setTimeout(() => setPhase("idle"), BACK_ONLINE_MS + LEAVE_MS)
      );
    };
    const onOffline = () => {
      clear();
      setPhase("idle");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clear();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const visible = !online || phase !== "idle";
  // satu kartu yang sama berbalik saat koneksi kembali, supaya perubahan
  // status terbaca sebagai "kartunya dibalik", bukan notifikasi baru
  const flipped = online && phase !== "idle";
  const hint = offlineHint(pathname);

  return (
    // region selalu ada di DOM supaya pembaca layar mengumumkan perubahan
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center md:inset-x-auto md:right-6 md:bottom-6 md:w-96"
    >
      <span className="sr-only">
        {visible ? (flipped ? "Kembali online" : `Kamu sedang offline. ${hint}`) : ""}
      </span>
      {visible && (
        <div
          className={cn(
            "pointer-events-auto w-full max-w-sm origin-bottom [perspective:900px]",
            phase === "leaving"
              ? "motion-safe:animate-tilt-away"
              : "motion-safe:animate-tilt-up"
          )}
        >
          <div
            className={cn(
              "grid transition-transform duration-[600ms] ease-[cubic-bezier(0.3,1.3,0.5,1)] [transform-style:preserve-3d] motion-reduce:transition-none",
              flipped && "[transform:rotateY(180deg)]"
            )}
          >
            <div
              aria-hidden
              className="flex items-start gap-3 rounded-2xl bg-foreground p-3.5 text-background shadow-lg [grid-area:1/1] [backface-visibility:hidden]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-amber-950">
                <WifiOff className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 space-y-0.5 pt-0.5">
                <p className="text-sm font-semibold">Kamu sedang offline</p>
                <p className="text-xs leading-relaxed opacity-80">{hint}</p>
              </div>
            </div>
            <div
              aria-hidden
              className="flex items-center gap-3 rounded-2xl border bg-background p-3.5 text-foreground shadow-lg [grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500 text-white">
                <Check className="h-4.5 w-4.5" />
              </span>
              <p className="text-sm font-semibold">Kembali online</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
