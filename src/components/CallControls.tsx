import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "./ui";

function IconMic({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
      {off ? (
        <>
          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
          <path d="M19 11a7 7 0 0 1-14 0" />
          <path d="M12 18v3" />
          <path d="m3 3 18 18" />
        </>
      ) : (
        <>
          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
          <path d="M19 11a7 7 0 0 1-14 0" />
          <path d="M12 18v3" />
        </>
      )}
    </svg>
  );
}

function IconCamera({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
      {off ? (
        <>
          <path d="M14.5 8.5 12 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5.5" />
          <path d="M16 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          <path d="m3 3 18 18" />
        </>
      ) : (
        <>
          <path d="M14.5 8.5 12 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2 2v-5.5" />
          <path d="M16 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </>
      )}
    </svg>
  );
}

function IconSkip() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
      <path d="M5 5l10 7-10 7V5Z" />
      <path d="M19 5v14" />
    </svg>
  );
}

function IconLeave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <path d="M22 2 11 13" />
      <path d="m15 2 7 7-7 7" />
    </svg>
  );
}

type ControlBtnProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger" | "active";
  icon: ReactNode;
  className?: string;
};

function ControlButton({ label, onClick, disabled, variant = "default", icon, className }: ControlBtnProps) {
  const variants = {
    default:
      "border-[rgb(var(--rt-control-border))] bg-[rgb(var(--rt-control-bg))] text-[rgb(var(--rt-fg))] hover:border-[rgb(var(--rt-control-border-hover))] hover:bg-[rgb(var(--rt-control-bg-hover))]",
    active:
      "border-[rgb(var(--rt-accent-cyan)/0.4)] bg-[rgb(var(--rt-accent-cyan)/0.15)] text-[rgb(var(--rt-fg))]",
    danger:
      "border-rose-500/30 bg-rose-500/20 text-rose-100 hover:border-rose-400/40 hover:bg-rose-500/30",
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: disabled ? 1 : 0.94 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-2 text-[10px] font-semibold uppercase tracking-wide transition focus:outline-none focus:ring-4 focus:ring-[rgb(var(--rt-ring))] disabled:opacity-45 sm:min-w-[72px] sm:flex-none sm:px-4",
        variants[variant],
        className,
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}

export default function CallControls({
  muted,
  cameraOff,
  disabled,
  onToggleMute,
  onToggleCamera,
  onNext,
  onLeave,
}: {
  muted: boolean;
  cameraOff: boolean;
  disabled?: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onNext: () => void;
  onLeave: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="flex w-full flex-wrap items-stretch justify-center gap-2 sm:gap-3"
    >
      <ControlButton
        label={muted ? "Unmute" : "Mute"}
        icon={<IconMic off={muted} />}
        onClick={onToggleMute}
        disabled={disabled}
        variant={muted ? "active" : "default"}
      />
      <ControlButton
        label={cameraOff ? "Camera on" : "Camera"}
        icon={<IconCamera off={cameraOff} />}
        onClick={onToggleCamera}
        disabled={disabled}
        variant={cameraOff ? "active" : "default"}
      />
      <ControlButton
        label="Next"
        icon={<IconSkip />}
        onClick={onNext}
        disabled={disabled}
      />
      <ControlButton
        label="Leave"
        icon={<IconLeave />}
        onClick={onLeave}
        disabled={disabled}
        variant="danger"
      />
    </motion.div>
  );
}
