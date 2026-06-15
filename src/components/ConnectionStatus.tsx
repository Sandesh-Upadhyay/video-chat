import type { ConnectionDisplayStatus } from "../types/ws";
import { cn } from "./ui";

const CONFIG: Record<ConnectionDisplayStatus, { label: string; dot: string; pulse?: boolean }> = {
  connecting: { label: "Connecting", dot: "bg-[rgb(var(--rt-accent-cyan))]", pulse: true },
  connected: { label: "Connected", dot: "bg-emerald-400" },
  disconnected: { label: "Disconnected", dot: "bg-slate-400" },
};

export default function ConnectionStatus({
  status,
  className,
  compact,
}: {
  status: ConnectionDisplayStatus;
  className?: string;
  compact?: boolean;
}) {
  const cfg = CONFIG[status];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] text-xs font-medium text-[rgb(var(--rt-muted))]",
        compact ? "px-2 py-0.5" : "px-3 py-1",
        className,
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", cfg.dot, cfg.pulse && "animate-pulse")} />
      <span className="text-[rgb(var(--rt-fg))]">{cfg.label}</span>
    </div>
  );
}
