import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

type WsInbound =
  | { type: "welcome"; clientId: string; country: string; gender: string }
  | { type: "queued"; position: number }
  | { type: "matched"; partnerId: string; sessionId: string; role: "initiator" | "responder" }
  | { type: "partner_disconnected"; reason: string }
  | { type: "chat"; text: string; at: number }
  | { type: "signal"; signalType: "offer" | "answer" | "ice-candidate"; data: any }
  | { type: "error"; error: string; receivedType?: string };

type ChatItem = { from: "me" | "them" | "system"; text: string; at: number };

const WS_BASE = (import.meta.env.VITE_WS_URL as string | undefined) || "";
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || "";

function toHttpBase(wsOrHttpBase: string) {
  if (!wsOrHttpBase) return "";
  if (wsOrHttpBase.startsWith("wss://")) return `https://${wsOrHttpBase.slice("wss://".length)}`;
  if (wsOrHttpBase.startsWith("ws://")) return `http://${wsOrHttpBase.slice("ws://".length)}`;
  return wsOrHttpBase;
}

function buildWsUrl(country: string, gender: string) {
  // Prefer explicit env (e.g. "wss://api.example.com" or "ws://localhost:8080").
  // Otherwise use same host+port as the current page (works behind HTTPS proxies).
  const base = WS_BASE || `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
  const sp = new URLSearchParams();
  sp.set("country", country || "all");
  sp.set("gender", gender || "all");
  return `${base}/api/ws?${sp.toString()}`;
}

export default function VideoChat() {
  const [sp] = useSearchParams();
  const country = (sp.get("country") || "all").toLowerCase();
  const gender = (sp.get("gender") || "all").toLowerCase();

  const wsUrl = useMemo(() => buildWsUrl(country, gender), [country, gender]);

  const [status, setStatus] = useState<"idle" | "connecting" | "queued" | "matched" | "stopped">("idle");
  const [role, setRole] = useState<"initiator" | "responder" | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [devicesError, setDevicesError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const startedRef = useRef(false);
  const manualStopRef = useRef(false);
  const retryRef = useRef(0);
  const gaveUpRef = useRef(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  function pushSystem(text: string) {
    setChat((c) => [...c, { from: "system", text, at: Date.now() }]);
  }

  function wsSend(payload: any) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(payload));
  }

  async function checkBackendReachable() {
    // If user configured explicit bases, check those instead of same-origin.
    const explicit = API_BASE || WS_BASE;
    if (explicit) {
      try {
        const res = await fetch(`${toHttpBase(explicit)}/api/stats`, { method: "GET" });
        return res.ok;
      } catch {
        return false;
      }
    }

    // Same-origin dev/prod: verify /api/stats exists to avoid infinite WS reconnect spam
    try {
      const res = await fetch("/api/stats", { method: "GET" });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function ensureLocalMedia() {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setDevicesError(null);
      return stream;
    } catch (e: any) {
      const msg = e?.message || "Unable to access camera/microphone.";
      setDevicesError(msg);
      pushSystem("You have denied access to your devices. Partners will not see/hear you.");
      // Create an empty stream so UI still works
      const empty = new MediaStream();
      localStreamRef.current = empty;
      if (localVideoRef.current) localVideoRef.current.srcObject = empty;
      return empty;
    }
  }

  function teardownPeerConnection() {
    const pc = pcRef.current;
    pcRef.current = null;
    try {
      pc?.getSenders().forEach((s) => {
        try {
          pc.removeTrack(s);
        } catch {}
      });
      pc?.close();
    } catch {}

    remoteStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }

  async function createPeerConnection() {
    teardownPeerConnection();

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
    });
    pcRef.current = pc;

    const local = await ensureLocalMedia();
    local.getTracks().forEach((t) => pc.addTrack(t, local));

    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;

    pc.ontrack = (ev) => {
      ev.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      wsSend({ type: "ice-candidate", candidate: ev.candidate });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") pushSystem("Connected.");
      if (pc.connectionState === "failed") pushSystem("Connection failed. Try Next.");
    };

    return pc;
  }

  async function startMatching() {
    // Prevent duplicate connections in React dev StrictMode
    if (startedRef.current) return;
    startedRef.current = true;
    manualStopRef.current = false;
    gaveUpRef.current = false;

    setStatus("connecting");
    pushSystem("Connecting…");

    const backendOk = await checkBackendReachable();
    if (!backendOk) {
      setStatus("stopped");
      pushSystem("Backend not reachable. If deployed on Vercel, deploy the backend separately and set VITE_WS_URL to your wss:// backend.");
      startedRef.current = false;
      gaveUpRef.current = true;
      return;
    }

    // Open WS
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      retryRef.current = 0;
      pushSystem("Connected to server. Finding a partner…");
      setStatus("queued");
      // Server accepts many shapes; this one is explicit
      wsSend({ type: "enqueue" });
      await ensureLocalMedia();
    };

    ws.onmessage = async (ev) => {
      let msg: WsInbound;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      if (msg.type === "queued") {
        setStatus("queued");
        return;
      }

      if (msg.type === "matched") {
        setPartnerId(msg.partnerId);
        setSessionId(msg.sessionId);
        setRole(msg.role);
        setStatus("matched");
        pushSystem("Partner found.");

        const pc = await createPeerConnection();
        if (msg.role === "initiator") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          wsSend({ type: "offer", sdp: offer });
        }
        return;
      }

      if (msg.type === "partner_disconnected") {
        pushSystem("Partner left. Finding a new one…");
        setPartnerId(null);
        setSessionId(null);
        setRole(null);
        teardownPeerConnection();
        setStatus("queued");
        wsSend({ type: "enqueue" });
        return;
      }

      if (msg.type === "chat") {
        setChat((c) => [...c, { from: "them", text: msg.text, at: msg.at }]);
        return;
      }

      if (msg.type === "signal") {
        const pc = pcRef.current || (await createPeerConnection());

        if (msg.signalType === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.data?.sdp ?? msg.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          wsSend({ type: "answer", sdp: answer });
          return;
        }

        if (msg.signalType === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.data?.sdp ?? msg.data));
          return;
        }

        if (msg.signalType === "ice-candidate") {
          const candidate = msg.data?.candidate ?? msg.data;
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
          return;
        }
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      teardownPeerConnection();
      setPartnerId(null);
      setSessionId(null);
      setRole(null);
      setStatus("stopped");
      pushSystem("Disconnected from server.");

      // Auto-reconnect unless user explicitly stopped
      if (!manualStopRef.current && !gaveUpRef.current) {
        retryRef.current += 1;
        if (retryRef.current >= 5) {
          gaveUpRef.current = true;
          startedRef.current = false;
          pushSystem("Unable to maintain a connection. Please check your backend deployment / VITE_WS_URL and refresh.");
          return;
        }
        const delay = Math.min(5000, 700 * 2 ** (retryRef.current - 1));
        startedRef.current = false;
        setTimeout(() => startMatching(), delay);
      }
    };

    ws.onerror = () => {
      pushSystem("WebSocket error.");
    };
  }

  function stopAll() {
    manualStopRef.current = true;
    wsSend({ type: "stop" });
    wsRef.current?.close();
    wsRef.current = null;
    teardownPeerConnection();
    setStatus("stopped");
    setPartnerId(null);
    setSessionId(null);
    setRole(null);
    pushSystem("Stopped.");
  }

  function nextPartner() {
    pushSystem("Next…");
    wsSend({ type: "next" });
    teardownPeerConnection();
    setPartnerId(null);
    setSessionId(null);
    setRole(null);
    setStatus("queued");
  }

  function sendChat() {
    const text = chatDraft.trim();
    if (!text) return;
    setChatDraft("");
    setChat((c) => [...c, { from: "me", text, at: Date.now() }]);
    wsSend({ type: "chat", text });
  }

  useEffect(() => {
    startMatching();
    return () => {
      manualStopRef.current = true;
      try {
        wsRef.current?.close();
      } catch {}
      teardownPeerConnection();
      try {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      startedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_20px_60px_rgba(59,130,246,0.35)]" />
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight">RandomTalk</div>
            <div className="text-xs text-white/60">
              {status === "matched" ? "In call" : status === "queued" ? "Searching…" : status === "connecting" ? "Connecting…" : "Stopped"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm text-white/70 hover:text-white">
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 pb-12 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80">
                You
              </div>
              <video ref={localVideoRef} autoPlay playsInline muted className="aspect-video h-full w-full bg-black object-cover" />
              {devicesError ? (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-3 text-xs text-white/80">{devicesError}</div>
              ) : null}
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80">
                Partner
              </div>
              <video ref={remoteVideoRef} autoPlay playsInline className="aspect-video h-full w-full bg-black object-cover" />
              {status !== "matched" ? (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/80">
                    {status === "queued" || status === "connecting" ? "Finding a partner…" : "Not connected"}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={nextPartner}
                className="h-11 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white/90 transition hover:bg-white/10 active:bg-white/5"
              >
                Next
              </button>
              <button
                type="button"
                onClick={stopAll}
                className="h-11 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 px-5 text-sm font-semibold shadow-[0_20px_70px_rgba(59,130,246,0.35)] transition hover:brightness-110 active:brightness-95"
              >
                Stop
              </button>
            </div>

            <div className="text-xs text-white/60">
              {partnerId ? (
                <span>
                  Session <span className="text-white/80">{sessionId?.slice(0, 8)}</span> · Role{" "}
                  <span className="text-white/80">{role}</span>
                </span>
              ) : (
                <span>
                  Filters: <span className="text-white/80">{country}</span>, <span className="text-white/80">{gender}</span>
                </span>
              )}
            </div>
          </div>
        </section>

        <aside className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="text-sm font-semibold">Chat</div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              {status === "matched" ? "Connected" : "Waiting"}
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-auto px-4 py-4">
            {chat.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                Say hi when you match.
              </div>
            ) : null}

            {chat.map((m, idx) => {
              const align =
                m.from === "me" ? "ml-auto bg-sky-500/15 border-sky-400/20" : m.from === "them" ? "mr-auto bg-white/5 border-white/10" : "mx-auto bg-amber-500/10 border-amber-300/20";
              const text = m.from === "system" ? `• ${m.text}` : m.text;
              return (
                <div key={idx} className={`max-w-[92%] rounded-2xl border px-3 py-2 text-sm text-white/90 ${align}`}>
                  {text}
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex gap-2">
              <input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendChat();
                }}
                placeholder={status === "matched" ? "Type a message…" : "Waiting for partner…"}
                disabled={status !== "matched"}
                className="h-11 w-full rounded-2xl border border-white/10 bg-ink-900/60 px-4 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-sky-400/40 focus:ring-4 focus:ring-sky-500/10 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={sendChat}
                disabled={status !== "matched"}
                className="h-11 shrink-0 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 px-4 text-sm font-semibold shadow-[0_20px_70px_rgba(59,130,246,0.30)] transition hover:brightness-110 disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

