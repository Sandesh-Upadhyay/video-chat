import { type ReactNode, type RefObject } from "react";
import { motion } from "framer-motion";
import { Badge, cn } from "./ui";
import { VideoSkeleton } from "./Skeleton";

export default function VideoTile({
  label,
  videoRef,
  muted = false,
  isLocal = false,
  active = false,
  loading = false,
  overlay,
  footer,
  className,
}: {
  label: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  muted?: boolean;
  isLocal?: boolean;
  active?: boolean;
  loading?: boolean;
  overlay?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-[1.35rem] border bg-[rgb(var(--rt-video-bg))] shadow-[var(--rt-video-shadow)]",
        active
          ? "border-[rgb(var(--rt-accent-cyan)/0.35)] ring-1 ring-[rgb(var(--rt-accent-cyan)/0.2)]"
          : "border-[rgb(var(--rt-video-border))]",
        className,
      )}
    >
      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <Badge tone="neutral" className="border-white/10 bg-black/50 px-2.5 py-0.5 text-[11px] backdrop-blur-md">
          {label}
        </Badge>
      </div>

      {active ? (
        <div className="pointer-events-none absolute inset-0 z-[2] rounded-[1.35rem] shadow-[inset_0_0_40px_rgba(34,211,238,0.08)]" />
      ) : null}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted || isLocal}
        className={cn(
          "aspect-video h-full w-full object-cover transition duration-500",
          loading ? "opacity-0" : "opacity-100",
          isLocal && "scale-x-[-1]",
        )}
      />

      {loading ? <VideoSkeleton /> : null}
      {overlay}
      {footer}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-16 bg-gradient-to-t from-black/55 to-transparent" />
    </motion.div>
  );
}
