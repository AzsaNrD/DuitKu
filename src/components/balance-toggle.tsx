"use client";

import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "hide-balance";
const ATTR = "data-hide-balance";

// State-nya hidup di atribut <html> (di-set sebelum paint oleh inline
// script di root layout), jadi dibaca sebagai "external store".
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return document.documentElement.getAttribute(ATTR) === "true";
}

// Toggle sembunyikan nominal: CSS di globals.css mem-blur semua
// elemen ber-class "money" saat atribut ini aktif.
export function BalanceToggle() {
  const hidden = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function toggle() {
    // baca dari DOM langsung (bukan state render) agar bebas stale closure
    const next = !getSnapshot();
    document.documentElement.setAttribute(ATTR, String(next));
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // localStorage bisa gagal (private mode) — abaikan
    }
    listeners.forEach((notify) => notify());
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
    >
      {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      <span className="sr-only">
        {hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
      </span>
    </Button>
  );
}
