"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Membungkus elemen berbentuk kartu supaya miring mengikuti kursor seperti
// kartu fisik yang dipegang. Hanya aktif di perangkat berkursor dan saat
// pengguna tidak memilih kurangi gerakan; di HP kartunya diam.
// Nilai miring ditulis langsung ke CSS variable (bukan state React) supaya
// gerakan mouse tidak memicu render ulang.
export function TiltCard({
  children,
  className,
  max = 8,
  glare = false,
  glareClassName = "rounded-xl",
}: {
  children: React.ReactNode;
  className?: string;
  // sudut miring maksimum dalam derajat
  max?: number;
  // kilau tipis yang ikut posisi kursor, untuk kartu berwarna gelap/gradien
  glare?: boolean;
  glareClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const capable = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--tilt-x", `${((0.5 - y) * max * 2).toFixed(2)}deg`);
        el.style.setProperty("--tilt-y", `${((x - 0.5) * max * 2).toFixed(2)}deg`);
        el.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
        el.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
        el.dataset.tilting = "true";
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
      delete el.dataset.tilting;
    };
    // dipasang/dilepas ulang kalau kemampuan perangkat berubah, misalnya
    // tablet yang disambung mouse atau setelan kurangi gerakan diubah
    const sync = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      onLeave();
      if (capable.matches) {
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
      }
    };
    sync();
    capable.addEventListener("change", sync);
    return () => {
      cancelAnimationFrame(frame);
      capable.removeEventListener("change", sync);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [max]);

  return (
    <div ref={ref} className={cn("group/tilt [perspective:1000px]", className)}>
      <div
        className={cn(
          "relative h-full transition-transform duration-500 ease-out [transform-style:preserve-3d]",
          "[transform:rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))]",
          // saat kursor bergerak transisinya pendek supaya terasa responsif,
          // saat kursor pergi kartu kembali rata pelan-pelan
          "group-data-[tilting=true]/tilt:duration-100"
        )}
      >
        {children}
        {glare && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-data-[tilting=true]/tilt:opacity-100",
              "bg-[radial-gradient(circle_at_var(--glare-x,50%)_var(--glare-y,50%),rgb(255_255_255/0.22),transparent_60%)]",
              glareClassName
            )}
          />
        )}
      </div>
    </div>
  );
}
