import { ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function GlassCard({
  className,
  children
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border bg-[rgb(var(--rt-card-bg))] shadow-[0_30px_100px_rgba(0,0,0,0.40)] backdrop-blur-xl",
        "border-[rgb(var(--rt-card-border))]",
        "transition will-change-transform hover:-translate-y-0.5 hover:border-[rgb(var(--rt-card-border-hover))] hover:bg-[rgb(var(--rt-card-bg-hover))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: "neutral" | "sky" | "emerald" | "amber";
  className?: string;
}) {
  const tones: Record<typeof tone, string> = {
    neutral: "border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] text-[rgb(var(--rt-muted))]",
    sky: "border-[rgb(var(--rt-badge-sky-border))] bg-[rgb(var(--rt-badge-sky-bg))] text-[rgb(var(--rt-badge-sky-fg))]",
    emerald:
      "border-[rgb(var(--rt-badge-emerald-border))] bg-[rgb(var(--rt-badge-emerald-bg))] text-[rgb(var(--rt-badge-emerald-fg))]",
    amber: "border-[rgb(var(--rt-badge-amber-border))] bg-[rgb(var(--rt-badge-amber-bg))] text-[rgb(var(--rt-badge-amber-fg))]"
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PillToggle({
  items,
  value,
  onChange
}: {
  items: Array<{ value: string; label: string; icon?: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            className={cn(
              "group relative inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-3.5 text-[13px] transition sm:text-sm",
              "focus:outline-none focus:ring-4 focus:ring-sky-500/10",
              active
                ? "border-sky-300/35 bg-gradient-to-r from-sky-500/25 to-blue-600/15 text-white shadow-[0_16px_50px_rgba(56,189,248,0.18)]"
                : "border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] text-[rgb(var(--rt-muted))] hover:border-[rgb(var(--rt-card-border-hover))] hover:bg-[rgb(var(--rt-card-bg-hover))]",
            )}
          >
            {/* subtle inner highlight */}
            <span
              className={cn(
                "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity",
                active ? "opacity-100" : "group-hover:opacity-60",
              )}
              style={{
                background:
                  "radial-gradient(140px 70px at 30% 20%, rgba(255,255,255,0.14), transparent 55%)",
              }}
            />

            {it.icon ? <span className={cn("relative shrink-0 text-base", active ? "" : "opacity-90")}>{it.icon}</span> : null}
            <span className="relative font-semibold tracking-tight">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

