"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

// "0500000" -> "500.000": buang non-digit & nol di depan,
// lalu beri titik ribuan gaya Indonesia
function formatAmount(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Input nominal uang dengan titik ribuan yang mengikuti ketikan.
// Nilai yang tersimpan di form tetap mengandung titik — skema zod
// (lihat zod-schemas.ts) membuang titik sebelum validasi.
export function AmountInput({
  ref,
  ...props
}: React.ComponentProps<typeof Input>) {
  const innerRef = React.useRef<HTMLInputElement | null>(null);

  // format nilai awal (saat edit, react-hook-form mengisi angka polos)
  React.useEffect(() => {
    const el = innerRef.current;
    if (el && el.value) {
      const formatted = formatAmount(el.value);
      if (formatted !== el.value) el.value = formatted;
    }
  }, []);

  return (
    <Input
      ref={(el: HTMLInputElement | null) => {
        innerRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      onInput={(e) => {
        const el = e.currentTarget;
        const formatted = formatAmount(el.value);
        if (formatted !== el.value) {
          // pertahankan posisi kursor relatif dari belakang
          const fromEnd =
            el.value.length - (el.selectionStart ?? el.value.length);
          el.value = formatted;
          const pos = Math.max(0, formatted.length - fromEnd);
          el.setSelectionRange(pos, pos);
        }
      }}
      {...props}
    />
  );
}
