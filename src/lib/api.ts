/** In dev, empty base uses same-origin paths proxied by Vite to :8080. In prod, set VITE_API_URL. */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || "";
const WS_BASE = (import.meta.env.VITE_WS_URL as string | undefined) || "";

export function toHttpBase(wsOrHttpBase: string) {
  if (!wsOrHttpBase) return "";
  if (wsOrHttpBase.startsWith("wss://")) return `https://${wsOrHttpBase.slice("wss://".length)}`;
  if (wsOrHttpBase.startsWith("ws://")) return `http://${wsOrHttpBase.slice("ws://".length)}`;
  return wsOrHttpBase;
}

export function getApiBase() {
  const explicit = API_BASE || WS_BASE;
  if (explicit) return toHttpBase(explicit).replace(/\/$/, "");
  return "";
}

export function apiUrl(path: string) {
  const base = getApiBase();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

/** Build WebSocket URL with country/gender query params. Handles VITE_WS_URL that already includes /api/ws. */
export function buildWsUrl(country: string, gender: string) {
  const sp = new URLSearchParams();
  sp.set("country", country || "all");
  sp.set("gender", gender || "all");
  const query = sp.toString();

  if (WS_BASE) {
    const base = WS_BASE.replace(/\/$/, "");
    if (base.endsWith("/api/ws")) {
      return `${base}?${query}`;
    }
    return `${base}/api/ws?${query}`;
  }

  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/api/ws?${query}`;
}
