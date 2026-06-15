import { cn } from "./ui";

export default function SessionTimer({
  elapsed,
  className,
}: {
  elapsed: string;
  className?: string;
}) {
  return (
    <div className={cn("text-xs text-[rgb(var(--rt-muted2))]", className)}>
      Session: <span className="font-semibold tabular-nums text-[rgb(var(--rt-fg))]">{elapsed}</span>
    </div>
  );
}
