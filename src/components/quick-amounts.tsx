"use client";

const PRESETS = [10_000, 50_000, 100_000, 500_000, 1_000_000];

function compact(n: number) {
  return n >= 1_000_000 ? `${n / 1_000_000}jt` : `${n / 1_000}rb`;
}

// Chip nominal cepat: menambah nilai input (bisa dikombinasi,
// mis. +100rb lalu +50rb = 150.000). Nilai di-set lewat native setter
// + event input supaya format ribuan & react-hook-form ikut ter-update,
// persis seperti mengetik manual.
export function QuickAmounts({ targetId }: { targetId: string }) {
  function add(amount: number) {
    const el = document.getElementById(targetId) as HTMLInputElement | null;
    if (!el) return;
    const current = Number(el.value.replace(/\D/g, "")) || 0;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    setter?.call(el, String(current + amount));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => add(preset)}
          className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
        >
          +{compact(preset)}
        </button>
      ))}
    </div>
  );
}
