import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import { Badge, GlassCard, cn } from "../components/ui";

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
  const [statusNote, setStatusNote] = useState<string>("Connecting…");

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

  function note(text: string) {
    setStatusNote(text);
  }

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
      pushSystem("Camera/microphone access denied. Your partner won’t be able to see or hear you.");
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
      if (pc.connectionState === "connected") note("Connected");
      if (pc.connectionState === "failed") {
        note("Connection issue");
        pushSystem("Connection issue. Tap Next to try a new partner.");
      }
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
    note("Connecting…");

    const backendOk = await checkBackendReachable();
    if (!backendOk) {
      setStatus("stopped");
      note("Service unavailable");
      pushSystem("Service unavailable. Please try again in a moment.");
      startedRef.current = false;
      gaveUpRef.current = true;
      return;
    }

    // Open WS
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      retryRef.current = 0;
      note("Searching for a partner…");
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
        note("Searching for a partner…");
        return;
      }

      if (msg.type === "matched") {
        setPartnerId(msg.partnerId);
        setSessionId(msg.sessionId);
        setRole(msg.role);
        setStatus("matched");
        note("Partner found");
        pushSystem("Partner found. Say hi!");

        const pc = await createPeerConnection();
        if (msg.role === "initiator") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          wsSend({ type: "offer", sdp: offer });
        }
        return;
      }

      if (msg.type === "partner_disconnected") {
        note("Partner left — searching…");
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
      note("Disconnected");

      // Auto-reconnect unless user explicitly stopped
      if (!manualStopRef.current && !gaveUpRef.current) {
        retryRef.current += 1;
        note("Reconnecting…");
        if (retryRef.current >= 5) {
          gaveUpRef.current = true;
          startedRef.current = false;
          note("Can’t reconnect");
          pushSystem("We couldn’t reconnect. Please refresh the page and try again.");
          return;
        }
        const delay = Math.min(5000, 700 * 2 ** (retryRef.current - 1));
        startedRef.current = false;
        setTimeout(() => startMatching(), delay);
      }
    };

    ws.onerror = () => {
      note("Connection issue");
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
    note("Stopped");
    pushSystem("Chat ended.");
  }

  function nextPartner() {
    note("Searching for a new partner…");
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
          <img
            src="/logo.png"
            alt="RandomTalk"
            className="h-12 w-auto rounded-2xl shadow-[0_20px_60px_rgba(59,130,246,0.30)] sm:h-14"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <Badge tone={status === "matched" ? "emerald" : status === "stopped" ? "amber" : "sky"} className="bg-[rgb(var(--rt-card-bg))]">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  status === "matched"
                    ? "bg-emerald-400"
                    : status === "stopped"
                      ? "bg-amber-300"
                      : "bg-sky-400 animate-pulse",
                )}
              />
              {status === "matched" ? "In call" : status === "queued" ? "Searching…" : status === "connecting" ? "Connecting…" : "Stopped"}
            </Badge>
          </div>
          <ThemeToggle />
          <Link to="/" className="text-sm text-[rgb(var(--rt-muted))] hover:text-[rgb(var(--rt-fg))]">
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 pb-12 lg:grid-cols-[1.45fr_0.55fr]">
        <section className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <GlassCard className="relative overflow-hidden">
              <div className="absolute left-4 top-4 z-10">
                <Badge tone="neutral" className="bg-black/25">
                  You
                </Badge>
              </div>
              <div className="relative">
                <video ref={localVideoRef} autoPlay playsInline muted className="aspect-video h-full w-full bg-black object-cover" />
                <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" />
              </div>
              {devicesError ? (
                <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/60 p-3 text-xs text-white/80">
                  {devicesError}
                </div>
              ) : null}
            </GlassCard>

            <GlassCard className="relative overflow-hidden">
              <div className="absolute left-4 top-4 z-10">
                <Badge tone="neutral" className="bg-black/25">
                  Partner
                </Badge>
              </div>
              <div className="relative">
                <video ref={remoteVideoRef} autoPlay playsInline className="aspect-video h-full w-full bg-black object-cover" />
                <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" />
              </div>
              {status !== "matched" ? (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-2 text-sm text-white/85 backdrop-blur">
                    {status === "queued" || status === "connecting" ? "Finding a partner…" : "Not connected"}
                  </div>
                </div>
              ) : null}
            </GlassCard>
          </div>

          <GlassCard className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={nextPartner}
                className="h-11 rounded-2xl border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] px-5 text-sm font-semibold text-[rgb(var(--rt-fg))] transition hover:border-[rgb(var(--rt-card-border-hover))] hover:bg-[rgb(var(--rt-card-bg-hover))] focus:outline-none focus:ring-4 focus:ring-sky-500/10 active:brightness-[0.98]"
              >
                Next
              </button>
              <button
                type="button"
                onClick={stopAll}
                className="h-11 rounded-2xl bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-500 px-5 text-sm font-semibold text-white shadow-[0_20px_70px_rgba(59,130,246,0.35)] ring-1 ring-white/15 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-sky-500/20 active:brightness-95"
              >
                Stop
              </button>
            </div>

            <div className="text-xs text-[rgb(var(--rt-muted2))]">
              {partnerId ? (
                <span>
                  Session <span className="text-[rgb(var(--rt-fg))]">{sessionId?.slice(0, 8)}</span> · Role{" "}
                  <span className="text-[rgb(var(--rt-fg))]">{role}</span>
                </span>
              ) : (
                <span>
                  Filters: <span className="text-[rgb(var(--rt-fg))]">{country}</span>, <span className="text-[rgb(var(--rt-fg))]">{gender}</span>
                </span>
              )}
            </div>
            </div>
          </GlassCard>
        </section>

        <GlassCard className="flex min-h-[520px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[rgb(var(--rt-card-border))] px-5 py-4">
            <div className="grid gap-0.5">
              <div className="text-sm font-semibold">Chat</div>
              <div className="text-xs text-[rgb(var(--rt-muted2))]">{statusNote}</div>
            </div>
            <Badge tone={status === "matched" ? "emerald" : status === "stopped" ? "amber" : "sky"}>
              {status === "matched" ? "Connected" : status === "stopped" ? "Offline" : "Searching"}
            </Badge>
          </div>

          <div className="flex-1 space-y-2 overflow-auto px-4 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent]">
            {chat.length === 0 ? (
              <div className="rounded-2xl border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] p-4 text-sm text-[rgb(var(--rt-muted))]">
                Say hi when you match.
              </div>
            ) : null}

            {chat.map((m, idx) => {
              const align =
                m.from === "me"
                  ? "ml-auto border-sky-400/20 bg-sky-500/15"
                  : m.from === "them"
                    ? "mr-auto border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))]"
                    : "mx-auto border-amber-300/20 bg-amber-500/10";
              const text = m.from === "system" ? `• ${m.text}` : m.text;
              return (
                <div
                  key={idx}
                  className={cn(
                    "max-w-[92%] rounded-2xl border px-3 py-2 text-sm text-[rgb(var(--rt-fg))]",
                    m.from === "system" ? "text-[rgb(var(--rt-muted))]" : "",
                    align,
                  )}
                >
                  {text}
                </div>
              );
            })}
          </div>

          <div className="border-t border-[rgb(var(--rt-card-border))] p-4">
            <div className="flex gap-2">
              <input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendChat();
                }}
                placeholder={status === "matched" ? "Type a message…" : "Waiting for partner…"}
                disabled={status !== "matched"}
                className="h-11 w-full rounded-2xl border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-field-bg))] px-4 text-sm text-[rgb(var(--rt-fg))] outline-none transition placeholder:text-[rgb(var(--rt-muted2))] focus:border-sky-300/25 focus:ring-4 focus:ring-sky-500/10 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={sendChat}
                disabled={status !== "matched"}
                className="h-11 shrink-0 rounded-2xl bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-500 px-4 text-sm font-semibold text-white shadow-[0_20px_70px_rgba(59,130,246,0.30)] ring-1 ring-white/15 transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-sky-500/20 disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}

