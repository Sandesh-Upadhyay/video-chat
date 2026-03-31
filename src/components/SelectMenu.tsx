import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "./ui";

type Item = { value: string; label: string; icon?: string };

function useClickOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onOutside();
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [onOutside, ref]);
}

export default function SelectMenu({
  label,
  value,
  onChange,
  items,
  leadingIcon,
  searchable = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: Item[];
  leadingIcon?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useClickOutside(rootRef, () => setOpen(false));

  const selected = useMemo(() => items.find((i) => i.value === value) ?? items[0], [items, value]);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!searchable || !query) return items;
    return items.filter((i) => i.label.toLowerCase().includes(query));
  }, [items, q, searchable]);

  useEffect(() => {
    if (!open) return;
    if (!searchable) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, searchable]);

  return (
    <div ref={rootRef} className="grid gap-2">
      <span className="text-xs font-medium text-[rgb(var(--rt-muted))]">{label}</span>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group relative flex h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4",
          "border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-field-bg))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          "transition hover:border-[rgb(var(--rt-card-border-hover))] focus:outline-none focus:ring-4 focus:ring-sky-500/10",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-xl border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] text-[rgb(var(--rt-muted2))]">
            {leadingIcon ?? "🌍"}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-[rgb(var(--rt-fg))]">{selected?.label}</span>
        </span>

        <span className="grid h-8 w-8 place-items-center rounded-xl border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] text-[rgb(var(--rt-muted2))] transition group-hover:bg-[rgb(var(--rt-card-bg-hover))]">
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={cn(
              "relative z-20 -mt-1 overflow-hidden rounded-3xl border",
              "border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg-hover))] backdrop-blur-xl",
              "shadow-[0_30px_90px_rgba(0,0,0,0.25)]",
            )}
          >
            {searchable ? (
              <div className="border-b border-[rgb(var(--rt-card-border))] p-3">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-[rgb(var(--rt-muted2))]">
                    ⌕
                  </div>
                  <input
                    ref={inputRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search…"
                    className="h-11 w-full rounded-2xl border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-field-bg))] pl-9 pr-3 text-sm text-[rgb(var(--rt-fg))] outline-none focus:border-sky-300/25 focus:ring-4 focus:ring-sky-500/10"
                  />
                </div>
              </div>
            ) : null}

            <div role="listbox" className="max-h-72 overflow-auto p-2">
              {filtered.map((it) => {
                const active = it.value === value;
                return (
                  <button
                    key={it.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(it.value);
                      setOpen(false);
                      setQ("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition",
                      active
                        ? "bg-sky-500/15 text-[rgb(var(--rt-fg))] shadow-[inset_0_0_0_1px_rgba(56,189,248,0.25)]"
                        : "text-[rgb(var(--rt-muted))] hover:bg-[rgb(var(--rt-card-bg))] hover:text-[rgb(var(--rt-fg))]",
                    )}
                  >
                    <span className="min-w-0 truncate font-semibold">{it.label}</span>
                    {active ? <span className="text-sky-400">✓</span> : <span className="text-[rgb(var(--rt-muted2))]">{it.icon ?? ""}</span>}
                  </button>
                );
              })}

              {filtered.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-[rgb(var(--rt-muted2))]">No results</div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

