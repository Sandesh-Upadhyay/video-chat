import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../lib/api";

type StatsResponse = {
  ok?: boolean;
  usersOnline?: number;
  connections?: number;
};

/** Polls GET /api/stats every 5s. In dev, Vite proxies /api to the backend on :8080. */
export function useOnlineStats(pollMs = 5_000) {
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/stats"), { method: "GET" });
      if (!res.ok) throw new Error("stats failed");
      const data = (await res.json()) as StatsResponse;
      const count =
        typeof data.usersOnline === "number"
          ? data.usersOnline
          : typeof data.connections === "number"
            ? data.connections
            : 0;
      setOnlineUsers(count);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(id);
  }, [load, pollMs]);

  return { onlineUsers, loading, error, retry: load };
}
