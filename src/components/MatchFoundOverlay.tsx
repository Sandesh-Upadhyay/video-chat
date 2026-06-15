import { AnimatePresence, motion } from "framer-motion";

export default function MatchFoundOverlay({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="match-found"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-30 grid place-items-center bg-black/55 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="relative flex flex-col items-center gap-4 px-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6, times: [0, 0.6, 1] }}
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(var(--rt-accent-cyan))] via-[rgb(var(--rt-accent-coral))] to-[rgb(var(--rt-accent-amber))] shadow-[0_0_60px_rgba(34,211,238,0.45)]"
            >
              <span className="text-3xl">🎉</span>
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-white/30"
                animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
              />
            </motion.div>
            <div>
              <motion.p
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-lg font-bold text-white"
              >
                Partner found!
              </motion.p>
              <motion.p
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="mt-1 text-sm text-white/75"
              >
                Connecting your video…
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
