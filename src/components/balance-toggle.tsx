"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "hide-balance";
const ATTR = "data-hide-balance";

// Toggle sembunyikan nominal: mengatur atribut di <html>, lalu CSS
// (globals.css) mem-blur semua elemen ber-class "money".
export function BalanceToggle() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(document.documentElement.getAttribute(ATTR) === "true");
  }, []);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    document.documentElement.setAttribute(ATTR, String(next));
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // localStorage bisa gagal (private mode) — abaikan
    }
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
