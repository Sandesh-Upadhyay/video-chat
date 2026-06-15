import { cn } from "./ui";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] motion-safe:animate-[shimmerSkeleton_1.8s_ease-in-out_infinite]",
        className,
      )}
    />
  );
}

export function VideoSkeleton() {
  return (
    <div className="absolute inset-0 z-[1] grid place-items-center bg-[rgb(var(--rt-video-bg))]">
      <div className="flex w-full max-w-[70%] flex-col items-center gap-4 px-6">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-3 w-32 rounded-full" />
        <Skeleton className="h-2 w-24 rounded-full opacity-60" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.08),transparent_60%)]" />
    </div>
  );
}
