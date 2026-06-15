import { apiUrl } from "./api";

const STUN_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

let cached: RTCIceServer[] | null = null;

/** Fetches ICE servers from GET /api/ice; falls back to Google STUN on error. */
export async function fetchIceServers(): Promise<RTCIceServer[]> {
  if (cached) return cached;

  try {
    const res = await fetch(apiUrl("/api/ice"), { method: "GET" });
    if (!res.ok) throw new Error("ice fetch failed");
    const data = (await res.json()) as { iceServers?: RTCIceServer[] };
    if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
      cached = data.iceServers;
      return cached;
    }
  } catch {
    // fall through to defaults
  }

  cached = STUN_SERVERS;
  return cached;
}
