import { useEffect, useState } from "react";

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Returns elapsed MM:SS since connectedAt.
 * Resets when connectedAt is set to null (partner left, Next, Stop, or disconnect).
 */
export function useConnectionTimer(connectedAt: number | null) {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    if (!connectedAt) {
      setElapsed("00:00");
      return;
    }

    const tick = () => setElapsed(formatElapsed(Date.now() - connectedAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [connectedAt]);

  return elapsed;
}
