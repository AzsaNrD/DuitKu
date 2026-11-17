"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Memunculkan elemen pelan-pelan saat masuk layar (sekali saja).
// Gaya awal tersembunyi hanya berlaku jika pengguna tidak memilih kurangi
// gerakan (lihat .reveal di globals.css), jadi konten tidak pernah hilang.
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  // elemen pembungkus, mis. "li" bila berada langsung di dalam <ol>
  as?: React.ElementType;
  // jeda dalam ms, untuk susunan bertahap antar kartu bersebelahan
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown={shown || undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("reveal", className)}
    >
      {children}
    </Tag>
  );
}
