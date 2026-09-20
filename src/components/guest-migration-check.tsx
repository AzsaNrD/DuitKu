"use client";

import { useState } from "react";
import { GuestMigrationDialog } from "@/components/guest-migration-dialog";
import { useHasGuestData } from "@/lib/guest-store";

// Dipasang di (app)/layout.tsx (bukan di form login/daftar) karena proxy.ts
// mengarahkan ulang setiap request ke /login /register begitu sesi sudah
// aktif — kalau dialog ini dipanggil dari sana, request server action
// importGuestData ikut kena redirect itu dan responsnya rusak. Di sini,
// pengguna sudah pasti berada di halaman ber-sesi, jadi aman.
export function GuestMigrationCheck() {
  const hasGuestData = useHasGuestData();
  const [dismissed, setDismissed] = useState(false);

  if (!hasGuestData || dismissed) return null;

  return (
    <GuestMigrationDialog open onDone={() => setDismissed(true)} />
  );
}
