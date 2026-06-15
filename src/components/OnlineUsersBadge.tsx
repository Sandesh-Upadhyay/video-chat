import { useOnlineStats } from "../hooks/useOnlineStats";
import { cn } from "./ui";

export default function OnlineUsersBadge({ className }: { className?: string }) {
  const { onlineUsers, loading, error, retry } = useOnlineStats();

  if (error) {
    return (
      <button
        type="button"
        onClick={() => void retry()}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] px-3 py-1 text-xs font-medium text-[rgb(var(--rt-muted))]",
          className,
        )}
        title="Tap to retry"
      >
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Offline
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[rgb(var(--rt-badge-emerald-border))] bg-[rgb(var(--rt-badge-emerald-bg))] px-3 py-1 text-xs font-medium text-[rgb(var(--rt-badge-emerald-fg))]",
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        {!loading ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        ) : null}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            loading ? "animate-pulse bg-emerald-400/50" : "bg-emerald-400",
          )}
        />
      </span>
      <span>
        {loading ? (
          <span className="inline-block h-3 w-16 animate-pulse rounded bg-emerald-400/20" />
        ) : (
          <>
            <span className="mr-1">🟢</span>
            {onlineUsers?.toLocaleString() ?? "0"} Users Online
          </>
        )}
      </span>
    </div>
  );
}
