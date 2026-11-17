"use client";

import { useEffect, useRef, useState } from "react";
import { formatIDR } from "@/lib/format";

// Nominal yang menghitung naik dari 0 ke nilai akhir (ease-out expo:
// cepat di awal, melambat mendarat di angka sebenarnya). HTML dari server
// langsung berisi nilai akhir, jadi tanpa JS atau saat pengguna memilih
// kurangi gerakan angkanya tetap benar dan tidak berubah-ubah.
export function AnimatedMoney({
  value,
  duration = 1100,
  delay = 150,
}: {
  value: number;
  duration?: number;
  // jeda ms supaya hitungan mulai saat kartunya sudah mulai terlihat
  delay?: number;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // pertama kali: mulai dari 0; setelah itu (nilai berubah): dari angka
    // yang sedang tampil, supaya perubahan terasa menyambung
    const start = from.current ?? 0;
    from.current = value;
    if (reduce || start === value) {
      setShown(value);
      return;
    }

    let frame = 0;
    let t0 = 0;
    const timer = window.setTimeout(() => {
      const tick = (now: number) => {
        if (!t0) t0 = now;
        const p = Math.min(1, (now - t0) / duration);
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setShown(Math.round(start + (value - start) * eased));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      setShown(start);
      frame = requestAnimationFrame(tick);
    }, start === 0 ? delay : 0);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, duration, delay]);

  return <>{formatIDR(shown)}</>;
}
