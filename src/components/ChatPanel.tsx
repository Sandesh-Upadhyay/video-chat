import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessage } from "../types/ws";
import { Badge, GlassCard, cn } from "./ui";
import { Skeleton } from "./Skeleton";

function formatTime(at: number) {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel({
  messages,
  draft,
  onDraftChange,
  onSend,
  disabled,
  statusNote,
  connected,
  className,
}: {
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  statusNote?: string;
  connected?: boolean;
  className?: string;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <GlassCard className={cn("!transform-none flex min-h-[45dvh] flex-col overflow-hidden hover:!translate-y-0 lg:min-h-[520px]", className)}>
      <div className="flex items-center justify-between border-b border-[rgb(var(--rt-card-border))] px-4 py-3 sm:px-5 sm:py-4">
        <div className="grid gap-0.5">
          <div className="text-sm font-semibold">Chat</div>
          {statusNote ? (
            <motion.div
              key={statusNote}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-[rgb(var(--rt-muted2))]"
            >
              {statusNote}
            </motion.div>
          ) : null}
        </div>
        <Badge tone={connected ? "emerald" : disabled ? "amber" : "sky"}>
          {connected ? "Live" : disabled ? "Offline" : "Waiting"}
        </Badge>
      </div>

      <div className="flex-1 space-y-3 overflow-auto px-3 py-3 sm:px-4 sm:py-4 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent]">
        {disabled && messages.length === 0 ? (
          <div className="space-y-3 p-2">
            <Skeleton className="ml-auto h-10 w-[70%] rounded-2xl" />
            <Skeleton className="h-10 w-[55%] rounded-2xl opacity-70" />
            <Skeleton className="ml-auto h-10 w-[60%] rounded-2xl opacity-50" />
            <p className="pt-2 text-center text-xs text-[rgb(var(--rt-muted2))]">Chat unlocks when you match</p>
          </div>
        ) : null}

        {messages.length === 0 && !disabled ? (
          <div className="rounded-2xl border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] p-4 text-sm text-[rgb(var(--rt-muted))]">
            Say hi when you match.
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {messages.map((m, idx) => {
            if (m.from === "system") {
              return (
                <motion.div
                  key={`${m.at}-${idx}`}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="flex justify-center"
                >
                  <div className="max-w-[95%] rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1.5 text-center text-xs text-[rgb(var(--rt-muted))]">
                    {m.text}
                    <span className="ml-2 text-[rgb(var(--rt-muted2))]">{formatTime(m.at)}</span>
                  </div>
                </motion.div>
              );
            }

            const isMe = m.from === "me";
            return (
              <motion.div
                key={`${m.at}-${idx}`}
                initial={{ opacity: 0, y: 10, x: isMe ? 12 : -12 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}
              >
                <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-[rgb(var(--rt-muted2))]">
                  {isMe ? "You" : "Partner"} · {formatTime(m.at)}
                </span>
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl border px-3 py-2 text-sm text-[rgb(var(--rt-fg))] sm:max-w-[85%]",
                    isMe
                      ? "border-[rgb(var(--rt-accent-cyan)/0.25)] bg-[rgb(var(--rt-accent-cyan)/0.14)]"
                      : "border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))]",
                  )}
                >
                  {m.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <div className="border-t border-[rgb(var(--rt-card-border))] p-3 sm:p-4">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={disabled ? "Waiting for partner…" : "Type a message…"}
            disabled={disabled}
            className="h-11 min-h-[44px] min-w-0 flex-1 rounded-2xl border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-field-bg))] px-4 text-base text-[rgb(var(--rt-fg))] outline-none transition placeholder:text-[rgb(var(--rt-muted2))] focus:border-[rgb(var(--rt-accent-cyan)/0.35)] focus:ring-4 focus:ring-[rgb(var(--rt-ring))] disabled:opacity-60 sm:text-sm"
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onSend}
            disabled={disabled || !draft.trim()}
            className="h-11 min-h-[44px] shrink-0 rounded-2xl bg-gradient-to-r from-[rgb(var(--rt-accent-cyan))] via-[rgb(var(--rt-accent-coral))] to-[rgb(var(--rt-accent-amber))] px-4 text-sm font-semibold text-white shadow-[0_20px_70px_rgba(34,211,238,0.24)] ring-1 ring-white/15 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[rgb(var(--rt-ring-strong))] disabled:opacity-60"
          >
            Send
          </motion.button>
        </div>
      </div>
    </GlassCard>
  );
}
