"use client";

import { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";

// Status "sedang pindah halaman" untuk seluruh layout. Pathname baru berubah
// setelah server merespons, jadi klik menu dicatat di sini: sorotan menu
// langsung pindah, garis progres tampil, dan isi halaman lama sedikit
// meredup sampai halaman baru siap.
type Pending = { href: string; from: string };

const NavPendingContext = createContext<{
  pendingHref: string | null;
  start: (href: string) => void;
}>({ pendingHref: null, start: () => {} });

export function NavPendingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);

  // Hanya berlaku selama pathname belum berubah dari saat klik
  const pendingHref = pending && pending.from === pathname ? pending.href : null;

  function start(href: string) {
    // klik menu halaman yang sedang dibuka tidak mengubah pathname, jadi
    // status "pindah" tidak akan pernah selesai
    if (pathname.startsWith(href)) return;
    setPending({ href, from: pathname });
    // pengaman bila navigasi gagal atau dibatalkan
    setTimeout(() => setPending((p) => (p?.href === href ? null : p)), 10000);
  }

  return (
    <NavPendingContext.Provider value={{ pendingHref, start }}>
      {children}
    </NavPendingContext.Provider>
  );
}

// Menu aktif untuk disorot: tujuan klik bila sedang pindah, selain itu pathname
export function useOptimisticPath() {
  const pathname = usePathname();
  const { pendingHref, start } = useContext(NavPendingContext);
  const onNavigate = (href: string) => (e: React.MouseEvent) => {
    // klik dengan modifier membuka tab baru, halaman ini tidak berpindah
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    start(href);
  };
  return { current: pendingHref ?? pathname, onNavigate };
}

// Garis tipis di tepi atas layar selama pindah halaman
export function NavProgressBar() {
  const { pendingHref } = useContext(NavPendingContext);
  if (!pendingHref) return null;
  return (
    <div
      role="progressbar"
      aria-label="Memuat halaman"
      className="nav-progress fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-primary"
    />
  );
}

// Isi halaman lama tetap terlihat, hanya sedikit meredup. Jeda 150ms supaya
// perpindahan cepat tidak berkedip.
export function PendingContent({ children }: { children: React.ReactNode }) {
  const { pendingHref } = useContext(NavPendingContext);
  return (
    <div
      data-pending={pendingHref ? "" : undefined}
      aria-busy={pendingHref ? true : undefined}
      className="transition-opacity duration-200 data-[pending]:opacity-60 data-[pending]:delay-150"
    >
      {children}
    </div>
  );
}
