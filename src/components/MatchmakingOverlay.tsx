import { AnimatePresence, motion } from "framer-motion";
import type { MatchStatus } from "../types/ws";
import { Skeleton } from "./Skeleton";

export default function MatchmakingOverlay({
  status,
  queuePosition,
  country,
  gender,
  queueHint,
  liveStats,
}: {
  status: MatchStatus;
  queuePosition: number | null;
  country: string;
  gender: string;
  queueHint: string | null;
  liveStats: { connections: number; queueSize: number } | null;
}) {
  const show = status === "connecting" || status === "queued";
  const message =
    status === "connecting" ? "Connecting to server…" : "Searching for a partner…";

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="matchmaking"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-20 grid place-items-center overflow-hidden bg-[rgb(var(--rt-video-bg)/0.85)] backdrop-blur-md"
        >
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.15),transparent_55%)]" />
            <div className="absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-[rgb(var(--rt-accent-cyan)/0.5)] to-transparent motion-safe:animate-[scanLine_3s_ease-in-out_infinite]" />
          </div>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="relative flex max-w-xs flex-col items-center gap-4 px-6 text-center"
          >
            <div className="relative h-16 w-16">
              <span className="absolute inset-0 animate-ping rounded-full bg-[rgb(var(--rt-accent-cyan)/0.2)]" />
              <span className="absolute inset-1 rounded-full border border-[rgb(var(--rt-accent-cyan)/0.15)]" />
              <span className="absolute inset-3 animate-spin rounded-full border-2 border-[rgb(var(--rt-accent-cyan)/0.15)] border-t-[rgb(var(--rt-accent-cyan))]" />
              <span className="absolute inset-[18px] rounded-full bg-[rgb(var(--rt-accent-cyan)/0.35)]" />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">{message}</p>
              {status === "queued" && queuePosition !== null ? (
                <motion.p
                  key={queuePosition}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-white/65"
                >
                  Queue position:{" "}
                  <span className="font-semibold text-[rgb(var(--rt-accent-cyan))]">{queuePosition}</span>
                </motion.p>
              ) : (
                <div className="flex justify-center gap-2">
                  <Skeleton className="h-2 w-16 rounded-full opacity-50" />
                  <Skeleton className="h-2 w-10 rounded-full opacity-35" />
                </div>
              )}
              <p className="text-[11px] text-white/50">
                Filters: {country} / {gender}
              </p>
              {liveStats ? (
                <p className="text-[11px] text-white/45">
                  {liveStats.connections} online · {liveStats.queueSize} in queue
                </p>
              ) : null}
              {liveStats && liveStats.connections > 2 ? (
                <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100/90">
                  Close extra tabs — only 2 needed for local testing ({liveStats.connections} online).
                </p>
              ) : null}
              {queueHint ? (
                <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100/90">
                  {queueHint}
                </p>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
