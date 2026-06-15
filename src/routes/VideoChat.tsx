import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CallControls from "../components/CallControls";
import ChatPanel from "../components/ChatPanel";
import ConnectionStatus from "../components/ConnectionStatus";
import MatchFoundOverlay from "../components/MatchFoundOverlay";
import MatchmakingOverlay from "../components/MatchmakingOverlay";
import OnlineUsersBadge from "../components/OnlineUsersBadge";
import PartnerDisconnectedOverlay from "../components/PartnerDisconnectedOverlay";
import SessionTimer from "../components/SessionTimer";
import ThemeToggle from "../components/ThemeToggle";
import VideoTile from "../components/VideoTile";
import { useConnectionTimer } from "../hooks/useConnectionTimer";
import { apiUrl, buildWsUrl } from "../lib/api";
import { fetchIceServers } from "../lib/iceServers";
import { attachPcStateLogging, logRtc, pcStates } from "../lib/webrtcDebug";
import { normalizeIceCandidate, normalizeSessionDescription, toSignalingSdp } from "../lib/webrtcSignal";
import {
  toDisplayConnectionStatus,
  toSignalMessage,
  type ChatMessage,
  type MatchStatus,
  type RtcInternalStatus,
  type WsInbound,
} from "../types/ws";
import { GlassCard } from "../components/ui";

function resolveInitiator(clientId: string, partnerId: string): "initiator" | "responder" {
  return clientId.localeCompare(partnerId) < 0 ? "initiator" : "responder";
}

function mediaErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Unable to access camera/microphone.";
  if (/audio source|device in use|busy|allocated/i.test(msg)) {
    return `${msg} — close other tabs or apps using your mic, then tap Retry.`;
  }
  if (/permission|denied|not allowed/i.test(msg)) {
    return `${msg} — allow camera/mic in browser settings, then tap Retry.`;
  }
  return msg;
}

export default function VideoChat() {
  const [sp] = useSearchParams();
  const country = (sp.get("country") || "all").toLowerCase();
  const gender = (sp.get("gender") || "all").toLowerCase();
  const wsUrl = useMemo(() => buildWsUrl(country, gender), [country, gender]);

  const [status, setStatus] = useState<MatchStatus>("idle");
  const [rtcStatus, setRtcStatus] = useState<RtcInternalStatus>("disconnected");
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [role, setRole] = useState<"initiator" | "responder" | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string>("Connecting…");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [showMatchFound, setShowMatchFound] = useState(false);
  const [showPartnerLeft, setShowPartnerLeft] = useState(false);
  const [queueHint, setQueueHint] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState<{ connections: number; queueSize: number } | null>(null);

  const elapsed = useConnectionTimer(connectedAt);
  const displayStatus = toDisplayConnectionStatus(status, rtcStatus);
  const controlsDisabled = status === "connecting";

  const wsRef = useRef<WebSocket | null>(null);
  const startedRef = useRef(false);
  const manualStopRef = useRef(false);
  const retryRef = useRef(0);
  const gaveUpRef = useRef(false);
  const iceRestartAttemptsRef = useRef(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pcSetupPromiseRef = useRef<Promise<RTCPeerConnection> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const roleRef = useRef<"initiator" | "responder" | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const statusRef = useRef(status);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaWarnedRef = useRef(false);
  const partnerFoundWarnedRef = useRef(false);
  const videoErrorWarnedRef = useRef(false);
  const pendingMatchedRef = useRef<Extract<WsInbound, { type: "matched" }> | null>(null);
  const signalingQueueRef = useRef(Promise.resolve());
  const sessionHandledRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const enqueueSignal = useCallback((task: () => Promise<void>) => {
    signalingQueueRef.current = signalingQueueRef.current.then(task).catch(() => {});
  }, []);

  useEffect(() => {
    roleRef.current = role;
    statusRef.current = status;
  }, [role, status]);

  const note = useCallback((text: string) => setStatusNote(text), []);

  const pushSystem = useCallback((text: string) => {
    setChat((c) => [...c, { from: "system", text, at: Date.now() }]);
  }, []);

  const wsSend = useCallback((payload: unknown): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(payload));
    return true;
  }, []);

  const resetRtcState = useCallback((next: RtcInternalStatus = "disconnected") => {
    setRtcStatus(next);
    setConnectedAt(null);
    iceRestartAttemptsRef.current = 0;
  }, []);

  const checkBackendReachable = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/stats"), { method: "GET" });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const ensureLocalMedia = useCallback(
    async (opts?: { force?: boolean }) => {
      const existing = localStreamRef.current;
      if (existing && existing.getTracks().length > 0 && !opts?.force) {
        return existing;
      }

      if (existing) {
        existing.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      const attempts: MediaStreamConstraints[] = [
        { audio: true, video: true },
        { video: true },
        { audio: true },
      ];

      let lastErr: unknown = null;
      for (const constraints of attempts) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          setDevicesError(null);
          setLocalReady(stream.getVideoTracks().length > 0);
          mediaWarnedRef.current = false;
          return stream;
        } catch (e) {
          lastErr = e;
        }
      }

      const msg = mediaErrorMessage(lastErr);
      setDevicesError(msg);
      setLocalReady(false);
      if (!mediaWarnedRef.current) {
        mediaWarnedRef.current = true;
        pushSystem(msg);
      }
      return new MediaStream();
    },
    [pushSystem],
  );

  const retryMedia = useCallback(() => {
    void ensureLocalMedia({ force: true });
  }, [ensureLocalMedia]);

  const teardownPeerConnection = useCallback(() => {
    pcSetupPromiseRef.current = null;
    pendingCandidatesRef.current = [];
    const pc = pcRef.current;
    pcRef.current = null;
    try {
      pc?.getSenders().forEach((s) => {
        try {
          pc.removeTrack(s);
        } catch {
          // ignore
        }
      });
      pc?.close();
    } catch {
      // ignore
    }
    remoteStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const flushPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        // ignore — candidate may be stale
      }
    }
  }, []);

  const addIceCandidateSafe = useCallback(
    async (pc: RTCPeerConnection, candidate: RTCIceCandidateInit) => {
      if (!pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore
      }
    },
    [],
  );

  const attemptIceRestart = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || roleRef.current !== "initiator" || statusRef.current !== "matched") return false;

    try {
      setRtcStatus("reconnecting");
      note("Reconnecting…");
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      wsSend({ type: "offer", sdp: toSignalingSdp(offer) });
      logRtc("offer sent (ice restart)", {
        role: roleRef.current,
        sessionId: sessionIdRef.current,
        ...pcStates(pc),
      });
      return true;
    } catch {
      return false;
    }
  }, [note, wsSend]);

  const handleConnectionState = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    const state = pc.connectionState;
    logRtc("connectionState change", {
      role: roleRef.current,
      sessionId: sessionIdRef.current,
      connectionState: state,
      ...pcStates(pc),
    });
    if (state === "connecting" || state === "new") {
      setRtcStatus("connecting");
      note("Connecting video…");
    } else if (state === "connected") {
      setRtcStatus("connected");
      setConnectedAt((prev) => prev ?? Date.now());
      iceRestartAttemptsRef.current = 0;
      note("Connected");
    } else if (state === "disconnected") {
      if (statusRef.current === "matched") {
        setRtcStatus("reconnecting");
        note("Reconnecting…");
        window.setTimeout(() => {
          if (pcRef.current?.connectionState === "disconnected") void attemptIceRestart();
        }, 2000);
      }
    } else if (state === "failed") {
      if (statusRef.current !== "matched") {
        setRtcStatus("disconnected");
        return;
      }

      iceRestartAttemptsRef.current += 1;
      if (iceRestartAttemptsRef.current <= 2) {
        setRtcStatus("reconnecting");
        note("Reconnecting…");
        pushSystem("Connection issue. Attempting to reconnect…");
        const restarted = await attemptIceRestart();
        if (!restarted) {
          setRtcStatus("disconnected");
          note("Connection failed");
          pushSystem("Connection failed. Tap Next to try a new partner.");
        }
      } else {
        setRtcStatus("disconnected");
        setConnectedAt(null);
        note("Connection failed");
        pushSystem("Couldn't restore the call. Finding a new partner…");
        wsSend({ type: "next" });
      }
    } else if (state === "closed") {
      resetRtcState("disconnected");
    }
  }, [attemptIceRestart, note, pushSystem, resetRtcState, wsSend]);

  const createPeerConnection = useCallback(async () => {
    teardownPeerConnection();
    resetRtcState("connecting");

    const iceServers = await fetchIceServers();
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    attachPcStateLogging(pc, { role: roleRef.current, sessionId: sessionIdRef.current });

    const local = await ensureLocalMedia();
    local.getTracks().forEach((t) => pc.addTrack(t, local));

    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;

    pc.ontrack = (ev) => {
      const addTrack = (t: MediaStreamTrack) => {
        if (!remote.getTracks().some((rt) => rt.id === t.id)) {
          remote.addTrack(t);
        }
      };
      if (ev.streams[0]) {
        ev.streams[0].getTracks().forEach(addTrack);
      } else if (ev.track) {
        addTrack(ev.track);
      }
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      wsSend({ type: "ice-candidate", candidate: ev.candidate });
      logRtc("ice sent", {
        role: roleRef.current,
        sessionId: sessionIdRef.current,
        extra: ev.candidate.candidate?.slice(0, 40),
      });
    };

    pc.onconnectionstatechange = () => {
      void handleConnectionState();
    };

    pc.oniceconnectionstatechange = () => {
      const ice = pc.iceConnectionState;
      logRtc("iceConnectionState change", {
        role: roleRef.current,
        sessionId: sessionIdRef.current,
        iceConnectionState: ice,
        ...pcStates(pc),
      });
      if (ice === "connected" || ice === "completed") {
        setRtcStatus("connected");
        setConnectedAt((prev) => prev ?? Date.now());
      } else if (ice === "checking") {
        setRtcStatus("connecting");
      } else if (ice === "disconnected" && statusRef.current === "matched") {
        setRtcStatus("reconnecting");
      } else if (ice === "failed" && statusRef.current === "matched") {
        void handleConnectionState();
      }
    };

    return pc;
  }, [ensureLocalMedia, handleConnectionState, resetRtcState, teardownPeerConnection, wsSend]);

  const getOrCreatePeerConnection = useCallback(async () => {
    if (pcRef.current) return pcRef.current;
    if (pcSetupPromiseRef.current) return pcSetupPromiseRef.current;
    pcSetupPromiseRef.current = createPeerConnection().finally(() => {
      pcSetupPromiseRef.current = null;
    });
    return pcSetupPromiseRef.current;
  }, [createPeerConnection]);

  const handleMatched = useCallback(
    async (msg: Extract<WsInbound, { type: "matched" }>) => {
      const myId = clientIdRef.current;
      if (!myId) return;

      if (sessionHandledRef.current === msg.sessionId) {
        logRtc("matched duplicate ignored", { sessionId: msg.sessionId });
        return;
      }

      sessionHandledRef.current = msg.sessionId;
      sessionIdRef.current = msg.sessionId;
      teardownPeerConnection();
      signalingQueueRef.current = Promise.resolve();

      videoErrorWarnedRef.current = false;
      const resolvedRole = msg.role ?? resolveInitiator(myId, msg.partnerId);
      setQueuePosition(null);
      setQueueHint(null);
      setPartnerId(msg.partnerId);
      setSessionId(msg.sessionId);
      setRole(resolvedRole);
      roleRef.current = resolvedRole;
      setStatus("matched");
      resetRtcState("connecting");
      setShowMatchFound(true);
      window.setTimeout(() => setShowMatchFound(false), 2600);
      note("Matched — connecting video…");

      logRtc("matched", {
        role: resolvedRole,
        sessionId: msg.sessionId,
        extra: { partnerId: msg.partnerId },
      });

      if (!partnerFoundWarnedRef.current) {
        partnerFoundWarnedRef.current = true;
        pushSystem("Partner found. Say hi!");
      }
      pushSystem(
        `Session ${msg.sessionId.slice(0, 8)} — both tabs must show the same ID for video to connect.`,
      );

      try {
        const pc = await getOrCreatePeerConnection();
        if (resolvedRole === "initiator") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          wsSend({ type: "offer", sdp: toSignalingSdp(offer) });
          logRtc("offer sent", {
            role: resolvedRole,
            sessionId: msg.sessionId,
            ...pcStates(pc),
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        pushSystem(`Video setup failed: ${message}. Try Next for a new partner.`);
        note("Video setup failed");
      }
    },
    [getOrCreatePeerConnection, note, pushSystem, resetRtcState, teardownPeerConnection, wsSend],
  );

  const handleSignal = useCallback(
    async (msg: Extract<WsInbound, { type: "signal" }>) => {
      try {
        const pc = await getOrCreatePeerConnection();
        const data = msg.data;
        const rtcCtx = {
          role: roleRef.current,
          sessionId: sessionIdRef.current,
          ...pcStates(pc),
        };
        const isPolite = roleRef.current === "responder";

        if (msg.signalType === "offer") {
          const raw =
            data != null && typeof data === "object" && "sdp" in (data as object)
              ? (data as { sdp?: unknown }).sdp ?? data
              : data;
          const sdp = normalizeSessionDescription(raw, "offer");
          if (!sdp) return;

          logRtc("offer received", rtcCtx);

          if (pc.signalingState === "stable" && pc.remoteDescription?.type === "offer") {
            logRtc("offer ignored (duplicate)", rtcCtx);
            return;
          }

          if (pc.signalingState === "have-local-offer") {
            if (!isPolite) {
              logRtc("offer ignored (impolite glare)", rtcCtx);
              return;
            }
            await pc.setLocalDescription({ type: "rollback" });
            logRtc("offer glare rollback (polite)", { ...rtcCtx, ...pcStates(pc) });
          }

          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushPendingCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          wsSend({ type: "answer", sdp: toSignalingSdp(answer) });
          logRtc("answer sent", { ...rtcCtx, ...pcStates(pc) });
          return;
        }

        if (msg.signalType === "answer") {
          logRtc("answer received", rtcCtx);

          if (pc.signalingState !== "have-local-offer") {
            logRtc("answer ignored", { ...rtcCtx, extra: `state=${pc.signalingState}` });
            return;
          }

          const raw =
            data != null && typeof data === "object" && "sdp" in (data as object)
              ? (data as { sdp?: unknown }).sdp ?? data
              : data;
          const sdp = normalizeSessionDescription(raw, "answer");
          if (!sdp) return;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushPendingCandidates(pc);
          logRtc("answer applied", { ...rtcCtx, ...pcStates(pc) });
          return;
        }

        if (msg.signalType === "ice-candidate") {
          const raw =
            data != null && typeof data === "object" && "candidate" in (data as object)
              ? (data as { candidate?: unknown }).candidate ?? data
              : data;
          const candidate = normalizeIceCandidate(raw);
          if (candidate) {
            logRtc("ice received", { ...rtcCtx, extra: candidate.candidate?.slice(0, 40) });
            await addIceCandidateSafe(pc, candidate);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logRtc("signal error", {
          role: roleRef.current,
          sessionId: sessionIdRef.current,
          extra: message,
        });
        if (!videoErrorWarnedRef.current) {
          videoErrorWarnedRef.current = true;
          pushSystem(`Video connection error: ${message}. Tap Next to try again.`);
        }
        note("Video connection error");
      }
    },
    [addIceCandidateSafe, flushPendingCandidates, getOrCreatePeerConnection, note, pushSystem, wsSend],
  );

  const startMatching = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    manualStopRef.current = false;
    gaveUpRef.current = false;
    partnerFoundWarnedRef.current = false;

    setStatus("connecting");
    setQueuePosition(null);
    resetRtcState("connecting");
    note("Connecting…");

    const backendOk = await checkBackendReachable();
    if (!backendOk) {
      setStatus("stopped");
      resetRtcState("disconnected");
      note("Service unavailable");
      pushSystem("Service unavailable. Please try again in a moment.");
      startedRef.current = false;
      gaveUpRef.current = true;
      return;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      retryRef.current = 0;
      await ensureLocalMedia();
    };

    ws.onmessage = (ev) => {
      void (async () => {
        let msg: WsInbound;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }

        if (msg.type === "welcome") {
          clientIdRef.current = msg.clientId;
          setStatus("queued");
          note("Searching for a partner…");
          wsSend({ type: "enqueue" });
          const pending = pendingMatchedRef.current;
          if (pending) {
            pendingMatchedRef.current = null;
            await handleMatched(pending);
          }
          return;
        }

        if (msg.type === "queued") {
          setStatus("queued");
          setQueuePosition(msg.position);
          setQueueHint(null);
          resetRtcState("disconnected");
          note("Searching for a partner…");
          return;
        }

        if (msg.type === "queue_hint") {
          setQueueHint(msg.message);
          return;
        }

        if (msg.type === "matched") {
          if (!clientIdRef.current) {
            pendingMatchedRef.current = msg;
            return;
          }
          await handleMatched(msg);
          return;
        }

        if (msg.type === "partner_disconnected") {
          setShowPartnerLeft(true);
          window.setTimeout(() => setShowPartnerLeft(false), 2400);
          note("Partner left — searching…");
          pushSystem("Partner left. Finding a new one…");
          setPartnerId(null);
          setSessionId(null);
          setRole(null);
          roleRef.current = null;
          sessionHandledRef.current = null;
          sessionIdRef.current = null;
          signalingQueueRef.current = Promise.resolve();
          teardownPeerConnection();
          resetRtcState("disconnected");
          setStatus("queued");
          wsSend({ type: "enqueue" });
          return;
        }

        if (msg.type === "error") {
          pushSystem(msg.error);
          note("Error");
          return;
        }

        if (msg.type === "chat") {
          setChat((c) => [...c, { from: "them", text: msg.text, at: msg.at }]);
          return;
        }

        const signalMsg = toSignalMessage(msg);
        if (signalMsg) {
          enqueueSignal(() => handleSignal(signalMsg));
          return;
        }
      })();
    };

    ws.onclose = () => {
      wsRef.current = null;
      teardownPeerConnection();
      setPartnerId(null);
      setSessionId(null);
      setRole(null);
      roleRef.current = null;
      clientIdRef.current = null;
      pendingMatchedRef.current = null;
      sessionHandledRef.current = null;
      sessionIdRef.current = null;
      signalingQueueRef.current = Promise.resolve();
      setQueuePosition(null);
      setStatus("stopped");
      resetRtcState("disconnected");
      note("Disconnected");

      if (!manualStopRef.current && !gaveUpRef.current) {
        retryRef.current += 1;
        setRtcStatus("reconnecting");
        note("Reconnecting…");
        if (retryRef.current >= 5) {
          gaveUpRef.current = true;
          startedRef.current = false;
          resetRtcState("disconnected");
          note("Can't reconnect");
          pushSystem("We couldn't reconnect. Please refresh the page and try again.");
          return;
        }
        const delay = Math.min(5000, 700 * 2 ** (retryRef.current - 1));
        startedRef.current = false;
        window.setTimeout(() => void startMatching(), delay);
      }
    };

    ws.onerror = () => {
      note("Connection issue");
    };
  }, [
    checkBackendReachable,
    ensureLocalMedia,
    enqueueSignal,
    handleMatched,
    handleSignal,
    note,
    pushSystem,
    resetRtcState,
    teardownPeerConnection,
    wsSend,
    wsUrl,
  ]);

  useEffect(() => {
    if (status !== "queued" && status !== "connecting") return;

    const pollStats = async () => {
      try {
        const res = await fetch(apiUrl("/api/stats"), { method: "GET" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          usersOnline?: number;
          connections?: number;
          queueSize?: number;
        };
        const online =
          typeof data.usersOnline === "number"
            ? data.usersOnline
            : typeof data.connections === "number"
              ? data.connections
              : 0;
        setLiveStats({
          connections: online,
          queueSize: typeof data.queueSize === "number" ? data.queueSize : 0,
        });
      } catch {
        // ignore
      }
    };

    void pollStats();
    const id = window.setInterval(() => void pollStats(), 5000);
    return () => window.clearInterval(id);
  }, [status]);

  const stopAll = useCallback(() => {
    manualStopRef.current = true;
    wsSend({ type: "stop" });
    wsRef.current?.close();
    wsRef.current = null;
    teardownPeerConnection();
    setStatus("stopped");
    setQueuePosition(null);
    setPartnerId(null);
    setSessionId(null);
    setRole(null);
    roleRef.current = null;
    clientIdRef.current = null;
    sessionHandledRef.current = null;
    sessionIdRef.current = null;
    signalingQueueRef.current = Promise.resolve();
    resetRtcState("disconnected");
    note("Stopped");
    pushSystem("Chat ended.");
  }, [note, pushSystem, resetRtcState, teardownPeerConnection, wsSend]);

  const nextPartner = useCallback(() => {
    note("Searching for a new partner…");
    wsSend({ type: "next" });
    teardownPeerConnection();
    setPartnerId(null);
    setSessionId(null);
    setRole(null);
    roleRef.current = null;
    sessionHandledRef.current = null;
    sessionIdRef.current = null;
    signalingQueueRef.current = Promise.resolve();
    resetRtcState("disconnected");
    setStatus("queued");
  }, [note, resetRtcState, teardownPeerConnection, wsSend]);

  const sendChat = useCallback(() => {
    const text = chatDraft.trim();
    if (!text || statusRef.current !== "matched") return;
    if (!wsSend({ type: "chat", text })) {
      pushSystem("Message not sent — connection lost. Try again.");
      return;
    }
    setChatDraft("");
    setChat((c) => [...c, { from: "me", text, at: Date.now() }]);
  }, [chatDraft, pushSystem, wsSend]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOff;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !next;
    });
    setCameraOff(next);
  }, [cameraOff]);

  const remoteReady = rtcStatus === "connected";
  const partnerLoading = status === "matched" && !remoteReady;

  useEffect(() => {
    startedRef.current = false;
    manualStopRef.current = false;
    void startMatching();

    return () => {
      manualStopRef.current = true;
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
      teardownPeerConnection();
      try {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      localStreamRef.current = null;
      startedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per wsUrl; startMatching uses refs internally
  }, [wsUrl]);

  return (
    <div className="page-enter min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-3 border-b border-[rgb(var(--rt-card-border))]/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/random-talk-logo.png"
            alt="RandomTalk"
            className="h-10 w-auto rounded-xl shadow-[0_16px_50px_rgba(34,211,238,0.2)] sm:h-12"
          />
          <span className="hidden text-sm font-semibold text-[rgb(var(--rt-fg))] sm:inline">Live Chat</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
          <OnlineUsersBadge />
          <ConnectionStatus status={displayStatus} compact />
          {connectedAt ? <SessionTimer elapsed={elapsed} className="hidden sm:block" /> : null}
          <ThemeToggle />
          <Link
            to="/"
            className="rounded-xl border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--rt-muted))] transition hover:text-[rgb(var(--rt-fg))]"
          >
            Exit
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-8 pt-4 sm:gap-6 sm:px-6 sm:pb-12 sm:pt-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <VideoTile
              label="Partner"
              videoRef={remoteVideoRef}
              active={remoteReady}
              loading={partnerLoading || status === "connecting" || status === "queued"}
              className="order-1 sm:order-2"
              overlay={
                <>
                  <MatchmakingOverlay
                    status={status}
                    queuePosition={queuePosition}
                    country={country}
                    gender={gender}
                    queueHint={queueHint}
                    liveStats={liveStats}
                  />
                  <MatchFoundOverlay show={showMatchFound} />
                  <PartnerDisconnectedOverlay show={showPartnerLeft} />
                  {status === "stopped" ? (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-black/50 backdrop-blur-sm">
                      <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-3 text-sm text-white/85">
                        Session ended
                      </div>
                    </div>
                  ) : null}
                </>
              }
            />

            <VideoTile
              label="You"
              videoRef={localVideoRef}
              isLocal
              muted
              active={localReady && !cameraOff}
              loading={!localReady && !devicesError}
              className="order-2 sm:order-1"
              overlay={
                cameraOff ? (
                  <div className="absolute inset-0 z-10 grid place-items-center bg-[rgb(var(--rt-video-bg))]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl">
                      📷
                    </div>
                    <p className="absolute bottom-14 text-xs text-white/60">Camera off</p>
                  </div>
                ) : null
              }
              footer={
                devicesError ? (
                  <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/70 p-3 text-xs text-white/80">
                    <p>{devicesError}</p>
                    <button
                      type="button"
                      onClick={retryMedia}
                      className="mt-2 rounded-lg bg-white/15 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-white/25"
                    >
                      Retry camera/mic
                    </button>
                  </div>
                ) : null
              }
            />
          </div>

          <GlassCard className="!transform-none p-4 hover:!translate-y-0 sm:p-5">
            <CallControls
              muted={muted}
              cameraOff={cameraOff}
              disabled={controlsDisabled}
              onToggleMute={toggleMute}
              onToggleCamera={toggleCamera}
              onNext={nextPartner}
              onLeave={stopAll}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--rt-card-border))] pt-3 text-xs text-[rgb(var(--rt-muted2))]">
              {connectedAt ? <SessionTimer elapsed={elapsed} className="sm:hidden" /> : <span />}
              {partnerId ? (
                <span title={sessionId ?? undefined}>
                  Session{" "}
                  <span className="font-mono font-semibold text-[rgb(var(--rt-accent-cyan))]">
                    {sessionId?.slice(0, 8)}
                  </span>
                  <span className="ml-1 text-[10px] text-white/40">(match both tabs)</span>
                  {muted ? <span className="ml-2 text-amber-300/80">· Muted</span> : null}
                </span>
              ) : (
                <span>
                  Filters: <span className="text-[rgb(var(--rt-fg))]">{country}</span> /{" "}
                  <span className="text-[rgb(var(--rt-fg))]">{gender}</span>
                </span>
              )}
            </div>
          </GlassCard>
        </section>

        <ChatPanel
          messages={chat}
          draft={chatDraft}
          onDraftChange={setChatDraft}
          onSend={sendChat}
          disabled={status !== "matched"}
          statusNote={statusNote}
          connected={displayStatus === "connected"}
        />
      </main>
    </div>
  );
}
