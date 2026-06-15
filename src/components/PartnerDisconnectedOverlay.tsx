import { AnimatePresence, motion } from "framer-motion";

export default function PartnerDisconnectedOverlay({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="partner-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-30 grid place-items-center bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="mx-6 max-w-sm rounded-3xl border border-white/10 bg-[rgb(var(--rt-panel-bg))] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-2xl"
            >
              👋
            </motion.div>
            <h3 className="text-base font-semibold text-[rgb(var(--rt-fg))]">Partner disconnected</h3>
            <p className="mt-2 text-sm text-[rgb(var(--rt-muted))]">
              They left the chat. Finding someone new for you…
            </p>
            <div className="mt-4 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full bg-[rgb(var(--rt-accent-cyan))]"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
