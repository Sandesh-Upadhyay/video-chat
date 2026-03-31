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
        "rounded-3xl border border-white/10 bg-white/6 shadow-[0_30px_100px_rgba(0,0,0,0.40)] backdrop-blur-xl",
        "transition will-change-transform hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/8",
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
    neutral: "border-white/10 bg-white/6 text-white/80",
    sky: "border-sky-300/20 bg-sky-500/15 text-sky-100",
    emerald: "border-emerald-300/20 bg-emerald-500/15 text-emerald-100",
    amber: "border-amber-200/20 bg-amber-500/15 text-amber-100"
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            className={cn(
              "group h-11 rounded-2xl border px-3 text-sm transition",
              "focus:outline-none focus:ring-4 focus:ring-sky-500/10",
              active
                ? "border-sky-300/25 bg-gradient-to-b from-sky-500/20 to-blue-600/10 text-white shadow-[0_16px_50px_rgba(56,189,248,0.16)]"
                : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
            )}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {it.icon ? <span className="text-base">{it.icon}</span> : null}
              <span className="font-medium">{it.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

